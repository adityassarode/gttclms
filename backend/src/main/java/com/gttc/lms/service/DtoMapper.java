package com.gttc.lms.service;

import com.gttc.lms.dto.BookResponse;
import com.gttc.lms.dto.BorrowResponse;
import com.gttc.lms.dto.DonationResponse;
import com.gttc.lms.dto.ReservationResponse;
import com.gttc.lms.dto.UserResponse;
import com.gttc.lms.model.Book;
import com.gttc.lms.model.Borrow;
import com.gttc.lms.model.Donation;
import com.gttc.lms.model.Reservation;
import com.gttc.lms.model.User;

public final class DtoMapper {
    private DtoMapper() {
    }

    public static UserResponse toUser(User user) {
        return toUser(user, user.getAvatarUrl());
    }

    public static UserResponse toUser(User user, String avatarUrl) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setName(user.getName());
        response.setAvatarUrl(avatarUrl);
        response.setPhone(user.getPhone());
        response.setRegisterNumber(user.getRegisterNumber());
        response.setDepartment(user.getDepartment());
        response.setSemester(user.getSemester());
        response.setYear(user.getYear());
        response.setRole(user.getRole());
        response.setStatus(user.getStatus());
        response.setVerified(user.isVerified());
        return response;
    }

    public static BookResponse toBook(Book book) {
        BookResponse response = new BookResponse();
        response.setId(book.getId());
        response.setTitle(book.getTitle());
        response.setAuthor(book.getAuthor());
        response.setDescription(book.getDescription());
        response.setCategory(book.getCategory());
        response.setKeywords(book.getKeywords());
        response.setCoverUrl(book.getCoverUrl());
        response.setCopiesTotal(book.getCopiesTotal());
        response.setCopiesAvailable(book.getCopiesAvailable());
        response.setFeatured(book.isFeatured());
        return response;
    }

    public static BorrowResponse toBorrow(Borrow borrow) {
        BorrowResponse response = new BorrowResponse();
        response.setId(borrow.getId());
        response.setBook(toBook(borrow.getBook()));
        response.setBorrowedAt(borrow.getBorrowedAt());
        response.setDueAt(borrow.getDueAt());
        response.setReturnedAt(borrow.getReturnedAt());
        response.setStatus(borrow.getStatus());
        response.setFee(borrow.getFee());
        return response;
    }

    public static ReservationResponse toReservation(Reservation reservation) {
        ReservationResponse response = new ReservationResponse();
        response.setId(reservation.getId());
        response.setBook(toBook(reservation.getBook()));
        response.setReservedAt(reservation.getReservedAt());
        response.setExpiresAt(reservation.getExpiresAt());
        response.setStatus(reservation.getStatus());
        return response;
    }

    public static DonationResponse toDonation(Donation donation) {
        DonationResponse response = new DonationResponse();
        response.setId(donation.getId());
        response.setTitle(donation.getTitle());
        response.setAuthor(donation.getAuthor());
        response.setDescription(donation.getDescription());
        response.setCopies(donation.getCopies());
        response.setImage1(donation.getImage1());
        response.setImage2(donation.getImage2());
        response.setDonorName(null);
        response.setCreatedAt(donation.getCreatedAt());
        return response;
    }
}
