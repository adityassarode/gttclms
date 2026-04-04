package com.gttc.lms.service;

import com.gttc.lms.dto.BookRequest;
import com.gttc.lms.dto.BookResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Book;
import com.gttc.lms.repository.BookRepository;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookService {
    private final BookRepository bookRepository;

    public BookService(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    @Transactional(readOnly = true)
    @Cacheable(
            cacheNames = "booksSearch",
            key = "T(java.util.Objects).toString(#q, '').trim().toLowerCase() + '|' + "
                    + "T(java.util.Objects).toString(#category, '').trim().toLowerCase() + '|' + "
                    + "T(java.util.Objects).toString(#featured, 'all')"
    )
    public List<BookResponse> search(String q, String category, Boolean featured) {
        String query = q == null ? "" : q.toLowerCase(Locale.ROOT).trim();
        String categoryFilter = category == null ? "" : category.toLowerCase(Locale.ROOT).trim();
        return bookRepository.search(query, categoryFilter, featured).stream()
                .map(DtoMapper::toBook)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "bookById", key = "#id")
    public BookResponse getBook(UUID id) {
        return DtoMapper.toBook(findBook(id));
    }

    @Transactional(readOnly = true)
    public Book findBook(UUID id) {
        return bookRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Book not found"));
    }

    @CacheEvict(cacheNames = {"booksSearch", "bookById"}, allEntries = true)
    public BookResponse createBook(BookRequest request) {
        Book book = new Book();
        book.setTitle(request.getTitle());
        book.setAuthor(request.getAuthor());
        book.setDescription(request.getDescription());
        book.setCategory(request.getCategory());
        book.setKeywords(request.getKeywords());
        book.setCoverUrl(request.getCoverUrl());
        book.setCopiesTotal(request.getCopiesTotal());
        book.setCopiesAvailable(request.getCopiesTotal());
        book.setFeatured(request.isFeatured());
        bookRepository.save(book);
        return DtoMapper.toBook(book);
    }

    @CacheEvict(cacheNames = {"booksSearch", "bookById"}, allEntries = true)
    public BookResponse updateBook(UUID id, BookRequest request) {
        Book book = findBook(id);
        book.setTitle(request.getTitle());
        book.setAuthor(request.getAuthor());
        book.setDescription(request.getDescription());
        book.setCategory(request.getCategory());
        book.setKeywords(request.getKeywords());
        book.setCoverUrl(request.getCoverUrl());
        int prevTotal = book.getCopiesTotal();
        int newTotal = request.getCopiesTotal();
        book.setCopiesTotal(newTotal);
        int delta = newTotal - prevTotal;
        if (delta > 0) {
            book.setCopiesAvailable(book.getCopiesAvailable() + delta);
        } else if (book.getCopiesAvailable() > newTotal) {
            book.setCopiesAvailable(newTotal);
        }
        book.setFeatured(request.isFeatured());
        bookRepository.save(book);
        return DtoMapper.toBook(book);
    }

    @CacheEvict(cacheNames = {"booksSearch", "bookById"}, allEntries = true)
    public void deleteBook(UUID id) {
        Book book = findBook(id);
        bookRepository.delete(book);
    }
}
