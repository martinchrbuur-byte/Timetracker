package app.services;

import app.models.TimeEntry;

import java.io.IOException;
import java.util.List;

/**
 * Storage abstraction to allow swapping local persistence with future backends.
 */
public interface LocalStorageService {
    List<TimeEntry> loadEntries() throws IOException;

    void saveEntries(List<TimeEntry> entries) throws IOException;
}
