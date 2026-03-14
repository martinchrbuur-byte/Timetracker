package app;

import app.services.CsvStorageService;
import app.services.LocalStorageService;
import app.services.TimeEntryService;
import app.web.WebServer;

import java.nio.file.Path;

/**
 * Entry point for the Work Hours Tracker web application.
 */
public class Main {
    public static void main(String[] args) {
        Path dataPath = Path.of("data", "time-entries.csv");

        LocalStorageService storageService = new CsvStorageService(dataPath);
        TimeEntryService timeEntryService = new TimeEntryService(storageService);

        WebServer server = new WebServer(8080, timeEntryService);
        try {
            server.start();
            System.out.println("Work Hours Tracker is running at http://localhost:8080");
            Runtime.getRuntime().addShutdownHook(new Thread(server::stop));
        } catch (Exception exception) {
            System.err.println("Failed to start web server: " + exception.getMessage());
        }
    }
}
