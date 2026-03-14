package app.ui;

import app.models.TimeEntry;
import app.util.DurationFormatter;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Scanner;

/**
 * Handles all CLI rendering and input.
 */
public class ConsoleView {
    private static final DateTimeFormatter DISPLAY_DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final Scanner scanner;

    public ConsoleView() {
        this.scanner = new Scanner(System.in);
    }

    public void showWelcome() {
        System.out.println("====================================");
        System.out.println(" Work Hours Tracker - Local V1");
        System.out.println("====================================");
    }

    public void showMainMenu(String status) {
        System.out.println();
        System.out.println("Status: " + status);
        System.out.println("[1] Check in");
        System.out.println("[2] Check out");
        System.out.println("[3] View today's entries");
        System.out.println("[4] View all entries");
        System.out.println("[5] View total duration today");
        System.out.println("[0] Exit");
        System.out.print("Select option: ");
    }

    public int readMenuChoice() {
        String input = scanner.nextLine();
        try {
            return Integer.parseInt(input.trim());
        } catch (NumberFormatException exception) {
            return -1;
        }
    }

    public void showEntries(String title, List<TimeEntry> entries) {
        System.out.println();
        System.out.println("--- " + title + " ---");

        if (entries.isEmpty()) {
            System.out.println("No entries found.");
            return;
        }

        System.out.println("Date       | Check-in            | Check-out           | Duration");
        System.out.println("-----------+---------------------+---------------------+---------");

        for (TimeEntry entry : entries) {
            String date = entry.getEntryDate().toString();
            String inValue = formatDateTime(entry.getCheckIn());
            String outValue = entry.getCheckOut() == null ? "OPEN" : formatDateTime(entry.getCheckOut());
            String duration = entry.getDuration().map(DurationFormatter::format).orElse("-");

            System.out.printf("%-10s | %-19s | %-19s | %s%n", date, inValue, outValue, duration);
        }
    }

    public void showMessage(String message) {
        System.out.println("OK: " + message);
    }

    public void showError(String message) {
        System.out.println("ERROR: " + message);
    }

    public String formatDateTime(LocalDateTime value) {
        return value.format(DISPLAY_DATE_TIME);
    }

    public String formatDuration(Duration duration) {
        return DurationFormatter.format(duration);
    }
}
