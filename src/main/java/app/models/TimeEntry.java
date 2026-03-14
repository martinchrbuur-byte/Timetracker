package app.models;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Domain model representing one work session.
 */
public class TimeEntry {
    private final String id;
    private final LocalDateTime checkIn;
    private LocalDateTime checkOut;

    public TimeEntry(String id, LocalDateTime checkIn, LocalDateTime checkOut) {
        this.id = id;
        this.checkIn = checkIn;
        this.checkOut = checkOut;
    }

    public String getId() {
        return id;
    }

    public LocalDateTime getCheckIn() {
        return checkIn;
    }

    public LocalDateTime getCheckOut() {
        return checkOut;
    }

    public void setCheckOut(LocalDateTime checkOut) {
        this.checkOut = checkOut;
    }

    public boolean isOpen() {
        return checkOut == null;
    }

    public LocalDate getEntryDate() {
        return checkIn.toLocalDate();
    }

    public Optional<Duration> getDuration() {
        if (checkOut == null) {
            return Optional.empty();
        }
        return Optional.of(Duration.between(checkIn, checkOut));
    }
}
