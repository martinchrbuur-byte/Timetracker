package app.web;

import app.models.TimeEntry;
import app.services.TimeEntryService;
import app.util.DurationFormatter;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.Executors;

/**
 * Minimal local web server for the vanilla JavaScript frontend and API.
 */
public class WebServer {
    private static final DateTimeFormatter DISPLAY_DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final int port;
    private final TimeEntryService service;
    private HttpServer server;

    public WebServer(int port, TimeEntryService service) {
        this.port = port;
        this.service = service;
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.setExecutor(Executors.newCachedThreadPool());

        server.createContext("/api/status", methodGuard("GET", this::handleStatus));
        server.createContext("/api/check-in", methodGuard("POST", this::handleCheckIn));
        server.createContext("/api/check-out", methodGuard("POST", this::handleCheckOut));
        server.createContext("/api/today", methodGuard("GET", this::handleToday));
        server.createContext("/api/history", methodGuard("GET", this::handleHistory));
        server.createContext("/api/today-total", methodGuard("GET", this::handleTodayTotal));
        server.createContext("/", this::handleStatic);

        server.start();
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    private HttpHandler methodGuard(String method, HttpHandler delegate) {
        return exchange -> {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                writeEmpty(exchange, 204);
                return;
            }

            if (!method.equalsIgnoreCase(exchange.getRequestMethod())) {
                writeJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }
            delegate.handle(exchange);
        };
    }

    private void handleStatus(HttpExchange exchange) throws IOException {
        String status = service.getOpenEntry()
                .map(entry -> "Checked in at " + formatDateTime(entry.getCheckIn()))
                .orElse("Not checked in");
        String json = "{\"status\":\"" + escapeJson(status) + "\"}";
        writeJson(exchange, 200, json);
    }

    private void handleCheckIn(HttpExchange exchange) throws IOException {
        String message = service.checkIn();
        boolean success = !message.startsWith("Cannot") && !message.startsWith("Check-in failed");
        String json = "{\"success\":" + success + ",\"message\":\"" + escapeJson(message) + "\"}";
        writeJson(exchange, 200, json);
    }

    private void handleCheckOut(HttpExchange exchange) throws IOException {
        String message = service.checkOut();
        boolean success = !message.startsWith("Cannot") && !message.startsWith("Check-out failed");
        String json = "{\"success\":" + success + ",\"message\":\"" + escapeJson(message) + "\"}";
        writeJson(exchange, 200, json);
    }

    private void handleToday(HttpExchange exchange) throws IOException {
        writeJson(exchange, 200, entriesToJson(service.getTodayEntries()));
    }

    private void handleHistory(HttpExchange exchange) throws IOException {
        writeJson(exchange, 200, entriesToJson(service.getAllEntries()));
    }

    private void handleTodayTotal(HttpExchange exchange) throws IOException {
        String total = DurationFormatter.format(service.getTotalDurationToday());
        writeJson(exchange, 200, "{\"total\":\"" + escapeJson(total) + "\"}");
    }

    private String entriesToJson(List<TimeEntry> entries) {
        StringBuilder builder = new StringBuilder();
        builder.append("[");
        for (int index = 0; index < entries.size(); index++) {
            TimeEntry entry = entries.get(index);
            String checkOut = entry.getCheckOut() == null ? "" : formatDateTime(entry.getCheckOut());
            String duration = entry.getDuration().map(DurationFormatter::format).orElse("-");

            builder.append("{")
                    .append("\"date\":\"").append(escapeJson(entry.getEntryDate().toString())).append("\",")
                    .append("\"checkIn\":\"").append(escapeJson(formatDateTime(entry.getCheckIn()))).append("\",")
                    .append("\"checkOut\":\"").append(escapeJson(checkOut.isEmpty() ? "OPEN" : checkOut)).append("\",")
                    .append("\"duration\":\"").append(escapeJson(duration)).append("\"")
                    .append("}");

            if (index < entries.size() - 1) {
                builder.append(",");
            }
        }
        builder.append("]");
        return builder.toString();
    }

    private String formatDateTime(LocalDateTime value) {
        return value.format(DISPLAY_DATE_TIME);
    }

    private void handleStatic(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
            return;
        }

        String rawPath = exchange.getRequestURI().getPath();
        String relativePath = "/".equals(rawPath) ? "index.html" : rawPath.substring(1);

        Path webRoot = Path.of("web");
        Path targetFile = webRoot.resolve(relativePath).normalize();

        if (!targetFile.startsWith(webRoot) || Files.notExists(targetFile) || Files.isDirectory(targetFile)) {
            writeText(exchange, 404, "Not Found", "text/plain; charset=utf-8");
            return;
        }

        byte[] content = Files.readAllBytes(targetFile);
        exchange.getResponseHeaders().add("Content-Type", detectContentType(targetFile));
        exchange.sendResponseHeaders(200, content.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(content);
        }
    }

    private String detectContentType(Path file) {
        String name = file.getFileName().toString().toLowerCase();
        if (name.endsWith(".html")) {
            return "text/html; charset=utf-8";
        }
        if (name.endsWith(".css")) {
            return "text/css; charset=utf-8";
        }
        if (name.endsWith(".js")) {
            return "application/javascript; charset=utf-8";
        }
        return "application/octet-stream";
    }

    private void writeJson(HttpExchange exchange, int statusCode, String json) throws IOException {
        writeText(exchange, statusCode, json, "application/json; charset=utf-8");
    }

    private void writeText(HttpExchange exchange, int statusCode, String body, String contentType) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        addCorsHeaders(exchange);
        exchange.getResponseHeaders().add("Content-Type", contentType);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private void writeEmpty(HttpExchange exchange, int statusCode) throws IOException {
        addCorsHeaders(exchange);
        exchange.sendResponseHeaders(statusCode, -1);
        exchange.close();
    }

    private void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
