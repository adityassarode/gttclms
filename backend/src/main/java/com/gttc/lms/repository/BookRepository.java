package com.gttc.lms.repository;

import com.gttc.lms.model.Book;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookRepository extends JpaRepository<Book, UUID> {
    List<Book> findByFeaturedTrue();

        @Query("""
                        select b
                        from Book b
                        where (:featured is null or b.featured = :featured)
                            and (:category = '' or lower(b.category) = :category)
                            and (
                                :q = ''
                                or lower(b.title) like concat('%', :q, '%')
                                or lower(b.author) like concat('%', :q, '%')
                                or lower(coalesce(b.keywords, '')) like concat('%', :q, '%')
                            )
                        order by b.title asc
                        """)
        List<Book> search(
                        @Param("q") String q,
                        @Param("category") String category,
                        @Param("featured") Boolean featured
        );
}
