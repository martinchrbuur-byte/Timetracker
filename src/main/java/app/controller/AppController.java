package app.controller;

import app.models.TimeEntry;
import app.services.TimeEntryService;
import app.ui.ConsoleView;

import java.time.Duration;
import java.util.List;

/**
 * Coordinates user interactions, business logic, and output rendering.
 */
public class AppController {
    private final ConsoleView view;
    private final TimeEntryService service;
    private boolean running;

    public AppController(ConsoleView view, TimeEntryService service) {
        this.view = view;
        this.service = service;
        this.running = true;
    }

    public void run() {
        view.showWelcome();

        while (running) {
            String status = service.getOpenEntry()
                    .map(entry -> "Checked in at " + view.formatDateTime(entry.getCheckIn()))
                    .orElse("Not checked in");

            view.showMainMenu(status);
            int choice = view.readMenuChoice();
            handleChoice(choice);
        }

        view.showMessage("Goodbye.");
    }

    private void handleChoice(int choice) {
        switch (choice) {
            case 1 -> view.showMessage(service.checkIn());
            case 2 -> view.showMessage(service.checkOut());
            case 3 -> showTodayEntries();
            case 4 -> showAllEntries();
            case 5 -> showTodayTotal();
            case 0 -> running = false;
            default -> view.showError("Unknown menu option. Please try again.");
        }
    }

    private void showTodayEntries() {
        List<TimeEntry> entries = service.getTodayEntries();
        view.showEntries("Today's entries", entries);
    }

    private void showAllEntries() {
        List<TimeEntry> entries = service.getAllEntries();
        view.showEntries("All entries", entries);
    }

    private void showTodayTotal() {
        Duration total = service.getTotalDurationToday();
        view.showMessage("Total tracked today: " + view.formatDuration(total));
    }
}
