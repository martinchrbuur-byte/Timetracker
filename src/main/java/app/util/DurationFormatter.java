package app.util;

import java.time.Duration;

/**
 * Utility for formatting durations as HH:mm:ss.
 */
public final class DurationFormatter {
    private DurationFormatter() {
    }

    public static String format(Duration duration) {
        long totalSeconds = Math.max(0, duration.getSeconds());
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;

        return String.format("%02d:%02d:%02d", hours, minutes, seconds);
    }
}
