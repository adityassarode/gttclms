package com.gttc.lms.service;

import com.gttc.lms.dto.BorrowResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Book;
import com.gttc.lms.model.Borrow;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.BorrowStatus;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.BorrowRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BorrowService {
    private static final int MAX_BORROWS = 2;
    private static final int LATE_FEE_PER_DAY = 10;

    private final BorrowRepository borrowRepository;
    private final BookService bookService;
    private final EmailService emailService;
    private final UserIdentityBridgeService userIdentityBridgeService;

    public BorrowService(
            BorrowRepository borrowRepository,
            BookService bookService,
            EmailService emailService,
            UserIdentityBridgeService userIdentityBridgeService
    ) {
        this.borrowRepository = borrowRepository;
        this.bookService = bookService;
        this.emailService = emailService;
        this.userIdentityBridgeService = userIdentityBridgeService;
    }

    @Transactional
    public BorrowResponse borrowBook(User user, UUID bookId) {
        validateUser(user);
        if (!user.isVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Verify your register number before borrowing");
        }
        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        long activeCount = borrowRepository.countByUserIdAndStatus(userId, BorrowStatus.BORROWED);
        if (activeCount >= MAX_BORROWS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Borrow limit reached (max 2 books)");
        }
        Book book = bookService.findBook(bookId);
        if (book.isDigital()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Digital books are available online and cannot be borrowed");
        }
        if (book.getCopiesAvailable() < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Book not available");
        }
        book.setCopiesAvailable(book.getCopiesAvailable() - 1);
        Borrow borrow = new Borrow();
        borrow.setUserId(userId);
        borrow.setBook(book);
        borrow.setBorrowedAt(Instant.now());
        borrow.setDueAt(Instant.now().plus(7, ChronoUnit.DAYS));
        borrow.setStatus(BorrowStatus.BORROWED);
        borrowRepository.save(borrow);
        emailService.send(user.getEmail(), "GTTC Library Borrow Confirmation",
                "Please return the book within 7 days to avoid late fees.");
        return DtoMapper.toBorrow(borrow);
    }

    @Transactional
    public BorrowResponse returnBook(User user, UUID borrowId) {
        validateUser(user);
        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        Borrow borrow = borrowRepository.findById(borrowId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Borrow record not found"));
        if (!borrow.getUserId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not allowed to return this book");
        }
        if (borrow.getStatus() == BorrowStatus.RETURNED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Book already returned");
        }
        borrow.setReturnedAt(Instant.now());
        borrow.setStatus(BorrowStatus.RETURNED);

        LocalDate dueDate = LocalDate.ofInstant(borrow.getDueAt(), ZoneId.systemDefault());
        LocalDate returnDate = LocalDate.ofInstant(borrow.getReturnedAt(), ZoneId.systemDefault());
        long daysLate = ChronoUnit.DAYS.between(dueDate, returnDate);
        if (daysLate > 0) {
            borrow.setFee((int) daysLate * LATE_FEE_PER_DAY);
            emailService.send(user.getEmail(), "Late Return Notice",
                    "Your return is late by " + daysLate + " day(s). Late fee: Rs " + borrow.getFee());
        } else {
            emailService.send(user.getEmail(), "Thank You for Returning on Time",
                    "Thank you for returning the book on time.");
        }
        borrow.getBook().setCopiesAvailable(borrow.getBook().getCopiesAvailable() + 1);
        borrowRepository.save(borrow);
        return DtoMapper.toBorrow(borrow);
    }

    @Transactional(readOnly = true)
    public List<BorrowResponse> listBorrows(User user) {
        validateUser(user);
        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        return borrowRepository.findByUserIdOrderByBorrowedAtDesc(userId)
                .stream()
                .map(DtoMapper::toBorrow)
                .collect(Collectors.toList());
    }

    private void validateUser(User user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }
}
