package com.gttc.lms.service;

import com.gttc.lms.dto.BookRequest;
import com.gttc.lms.dto.BookResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Book;
import com.gttc.lms.repository.BookRepository;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class BookService {
    private final BookRepository bookRepository;

    public BookService(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    public List<BookResponse> search(String q, String category, Boolean featured) {
        List<Book> books = bookRepository.findAll();
        String query = q == null ? "" : q.toLowerCase(Locale.ROOT).trim();
        String categoryFilter = category == null ? "" : category.toLowerCase(Locale.ROOT).trim();
        return books.stream()
                .filter(book -> featured == null || book.isFeatured() == featured)
                .filter(book -> categoryFilter.isBlank()
                        || book.getCategory().toLowerCase(Locale.ROOT).equals(categoryFilter))
                .filter(book -> query.isBlank()
                        || book.getTitle().toLowerCase(Locale.ROOT).contains(query)
                        || book.getAuthor().toLowerCase(Locale.ROOT).contains(query)
                        || (book.getKeywords() != null && book.getKeywords().toLowerCase(Locale.ROOT).contains(query)))
                .map(DtoMapper::toBook)
                .collect(Collectors.toList());
    }

    public BookResponse getBook(Long id) {
        return DtoMapper.toBook(findBook(id));
    }

    public Book findBook(Long id) {
        return bookRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Book not found"));
    }

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

    public BookResponse updateBook(Long id, BookRequest request) {
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

    public void deleteBook(Long id) {
        Book book = findBook(id);
        bookRepository.delete(book);
    }
}
