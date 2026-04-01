package com.gttc.lms.repository;

import com.gttc.lms.model.Book;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookRepository extends JpaRepository<Book, Long> {
    List<Book> findByFeaturedTrue();
}
