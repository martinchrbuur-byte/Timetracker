package app.services;

import app.models.TimeEntry;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Persists entries to CSV at data/time-entries.csv.
 */
public class CsvStorageService implements LocalStorageService {
    private static final String HEADER = "id,checkIn,checkOut";
    private final Path filePath;

    public CsvStorageService(Path filePath) {
        this.filePath = filePath;
    }

    @Override
    public List<TimeEntry> loadEntries() throws IOException {
        ensureFileExists();
        List<String> lines = Files.readAllLines(filePath, StandardCharsets.UTF_8);

        List<TimeEntry> result = new ArrayList<>();
        for (int index = 1; index < lines.size(); index++) {
            String line = lines.get(index).trim();
            if (line.isEmpty()) {
                continue;
            }

            String[] parts = line.split(",", -1);
            if (parts.length != 3) {
                continue;
            }

            String id = parts[0];
            LocalDateTime checkIn = LocalDateTime.parse(parts[1]);
            LocalDateTime checkOut = parts[2].isBlank() ? null : LocalDateTime.parse(parts[2]);
            result.add(new TimeEntry(id, checkIn, checkOut));
        }

        return result;
    }

    @Override
    public void saveEntries(List<TimeEntry> entries) throws IOException {
        ensureFileExists();

        List<String> lines = new ArrayList<>();
        lines.add(HEADER);

        for (TimeEntry entry : entries) {
            String checkOutValue = entry.getCheckOut() == null ? "" : entry.getCheckOut().toString();
            lines.add(entry.getId() + "," + entry.getCheckIn() + "," + checkOutValue);
        }

        Files.write(filePath, lines, StandardCharsets.UTF_8,
                StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
    }

    private void ensureFileExists() throws IOException {
        Path parent = filePath.getParent();
        if (parent != null && Files.notExists(parent)) {
            Files.createDirectories(parent);
        }

        if (Files.notExists(filePath)) {
            Files.writeString(filePath, HEADER + System.lineSeparator(), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.WRITE);
        }
    }
}
