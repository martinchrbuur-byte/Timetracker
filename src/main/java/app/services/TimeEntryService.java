package app.services;

import app.models.TimeEntry;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Contains business rules for tracking work sessions.
 */
public class TimeEntryService {
    private final LocalStorageService storage;
    private final List<TimeEntry> entries;

    public TimeEntryService(LocalStorageService storage) {
        this.storage = storage;
        this.entries = new ArrayList<>();
        loadInitialData();
    }

    public String checkIn() {
        if (getOpenEntry().isPresent()) {
            return "Cannot check in: an open session already exists.";
        }

        TimeEntry entry = new TimeEntry(UUID.randomUUID().toString(), LocalDateTime.now(), null);
        entries.add(entry);
        entries.sort(Comparator.comparing(TimeEntry::getCheckIn));

        try {
            persist();
            return "Check-in recorded at " + entry.getCheckIn() + ".";
        } catch (IOException exception) {
            entries.remove(entry);
            return "Check-in failed due to storage error: " + exception.getMessage();
        }
    }

    public String checkOut() {
        Optional<TimeEntry> open = getOpenEntry();
        if (open.isEmpty()) {
            return "Cannot check out: no open session found.";
        }

        TimeEntry entry = open.get();
        LocalDateTime previous = entry.getCheckOut();
        entry.setCheckOut(LocalDateTime.now());

        try {
            persist();
            return "Check-out recorded at " + entry.getCheckOut() + ".";
        } catch (IOException exception) {
            entry.setCheckOut(previous);
            return "Check-out failed due to storage error: " + exception.getMessage();
        }
    }

    public List<TimeEntry> getTodayEntries() {
        LocalDate today = LocalDate.now();
        return entries.stream()
                .filter(entry -> entry.getEntryDate().equals(today))
                .sorted(Comparator.comparing(TimeEntry::getCheckIn))
                .toList();
    }

    public List<TimeEntry> getAllEntries() {
        return entries.stream()
                .sorted(Comparator.comparing(TimeEntry::getCheckIn))
                .toList();
    }

    public Duration getTotalDurationToday() {
        return getTodayEntries().stream()
                .map(TimeEntry::getDuration)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .reduce(Duration.ZERO, Duration::plus);
    }

    public Optional<TimeEntry> getOpenEntry() {
        return entries.stream()
                .filter(TimeEntry::isOpen)
                .max(Comparator.comparing(TimeEntry::getCheckIn));
    }

    private void loadInitialData() {
        try {
            entries.addAll(storage.loadEntries());
            entries.sort(Comparator.comparing(TimeEntry::getCheckIn));
        } catch (IOException exception) {
            System.err.println("Failed to load existing entries: " + exception.getMessage());
        }
    }

    private void persist() throws IOException {
        storage.saveEntries(entries);
    }
}
