package spring.backend.game.service;

/**
 * Thrown when a non-admin player attempts to use an admin-only endpoint.
 * Handled by the global exception handler and mapped to HTTP 403.
 */
public class AdminAccessDeniedException extends RuntimeException {

    public AdminAccessDeniedException(String message) {
        super(message);
    }
}
