package com.gttc.lms.service;

import com.gttc.lms.model.Book;
import com.gttc.lms.model.Student;
import com.gttc.lms.repository.BookRepository;
import com.gttc.lms.repository.StudentRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class SeedDataRunner implements CommandLineRunner {
    private final StudentRepository studentRepository;
    private final BookRepository bookRepository;

    public SeedDataRunner(StudentRepository studentRepository, BookRepository bookRepository) {
        this.studentRepository = studentRepository;
        this.bookRepository = bookRepository;
    }

    @Override
    public void run(String... args) {
        seedStudents();
        seedBooks();
    }

    private void seedStudents() {
        if (studentRepository.count() > 0) {
            return;
        }
        String department = "DAIML";
        String semester = "4th sem";
        String year = "2024-2028";
        List<String[]> students = List.of(
                new String[]{"8080101", "ABHINANDAN NAMDEV JADHAV"},
                new String[]{"8080102", "ADINATH VASULKAR"},
                new String[]{"8080103", "ADITYA DEELIP GODASE"},
                new String[]{"8080104", "ADITYA SHRINIVAS SARODE"},
                new String[]{"8080107", "ARIHANT PATIL"},
                new String[]{"8080108", "ARUN BHAGANNAVAR"},
                new String[]{"8080110", "ATHARV SHETTY"},
                new String[]{"8080111", "BALAPPA GUNDU DODDAKALLANNAVAR"},
                new String[]{"8080114", "H FHIMUDDIN"},
                new String[]{"8080115", "HARSH GIRISH PATIL"},
                new String[]{"8080117", "KHUSHI TARALE"},
                new String[]{"8080118", "MAHALAKSHMEE MANJUNATH BADIGER"},
                new String[]{"8080119", "MAHESH MAHADEV NESARKAR"},
                new String[]{"8080120", "MEHRUNBEE DASTGEER MULLA"},
                new String[]{"8080121", "MOHMADANIYAJ JAKIRAHUSEN BHAGAWAN"},
                new String[]{"8080122", "MOHAMMADIBRAHIM FAROOQ BASARIKATTI"},
                new String[]{"8080123", "NAGAVENI PATIL"},
                new String[]{"8080124", "NAVEED RIZWAN DAFEDAR"},
                new String[]{"8080125", "NAVEENKUMAR NAGARAJ SARAVARI"},
                new String[]{"8080126", "PRAJWAL RAJU GADIWADDAR"},
                new String[]{"8080127", "RAKSHITA RAMESH KAMBLE"},
                new String[]{"8080128", "SALONI BELGAONKAR"},
                new String[]{"8080129", "SAMARTH NARAYAN SUNTHAKAR"},
                new String[]{"8080130", "SANAN ASIF MOMIN"},
                new String[]{"8080132", "SANKET GOVINDRAY MESTA"},
                new String[]{"8080133", "SANKET NARAYAN TAMMANACHE"},
                new String[]{"8080134", "SATISH CHIMANAPPAGOL"},
                new String[]{"8080135", "SHRIHARI SANJU SANADI"},
                new String[]{"8080136", "SHREYAS KISAN NILAJKAR"},
                new String[]{"8080138", "SUDEEP MAHESH HUCHCHARAYAPPAGOL"},
                new String[]{"8080139", "SURAJ YALLAPPA BHANDARI"},
                new String[]{"8080140", "SWAYAM SANDEEP ROKADE"},
                new String[]{"8080141", "TEJAS CHANDRAKANT PATHARVAT"},
                new String[]{"8080142", "TUKARAM PRAKASH PAGADE"},
                new String[]{"8080146", "AKASH N SHINGANNAVAR"},
                new String[]{"8080147", "MOHAMMAD TAHIR ABDUL BASIT SOUDAGAR"},
                new String[]{"8080150", "ADITI SATISH PATIL"},
                new String[]{"8080151", "AMRUTA YALLANAGOUDA CHIKKANAGOUDAR"},
                new String[]{"8080152", "DAYANANDA"},
                new String[]{"8080153", "PREETHI G R"},
                new String[]{"8080154", "SAJIDA JAILANI SHAIKH"},
                new String[]{"8080155", "SOMARAJ A"},
                new String[]{"8080156", "VAISHNAVI SADASHIV MIRAJAKAR"},
                new String[]{"8080157", "VIKAS YAMAKANAMARDI"}
        );
        for (String[] entry : students) {
            Student student = new Student();
            student.setRegisterNumber(entry[0]);
            student.setName(entry[1]);
            student.setDepartment(department);
            student.setSemester(semester);
            student.setYear(year);
            studentRepository.save(student);
        }
    }

    private void seedBooks() {
        if (bookRepository.count() > 0) {
            return;
        }
        List<Book> books = List.of(
                buildBook("The Psychology of Money", "Morgan Housel", "Money/Investing",
                        "Timeless lessons on wealth, greed, and happiness.",
                        "money,finance,investing", "https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg", 6, true),
                buildBook("Company of One", "Paul Jarvis", "Business",
                        "Staying small and thriving in the next business boom.",
                        "startup,business,solo", "https://covers.openlibrary.org/b/isbn/9781328972356-L.jpg", 4, true),
                buildBook("How Innovation Works", "Matt Ridley", "Business",
                        "Why it flourishes in freedom and stalls in bureaucracy.",
                        "innovation,systems,science", "https://covers.openlibrary.org/b/isbn/9780062916590-L.jpg", 5, true),
                buildBook("The Picture of Dorian Gray", "Oscar Wilde", "Fiction",
                        "A classic tale of vanity, morality, and consequence.",
                        "classic,fiction,drama", "https://covers.openlibrary.org/b/isbn/9780141439570-L.jpg", 5, true),
                buildBook("Atomic Habits", "James Clear", "Self Improvement",
                        "Tiny changes, remarkable results.",
                        "habits,productivity,self-improvement", "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg", 7, false),
                buildBook("Deep Work", "Cal Newport", "Self Improvement",
                        "Rules for focused success in a distracted world.",
                        "focus,productivity,work", "https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg", 4, false),
                buildBook("The Design of Everyday Things", "Don Norman", "Design",
                        "A guide to human-centered design.",
                        "design,ux,product", "https://covers.openlibrary.org/b/isbn/9780465050659-L.jpg", 3, false),
                buildBook("The Lean Startup", "Eric Ries", "Business",
                        "How to build a successful startup.",
                        "startup,entrepreneurship,lean", "https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg", 6, false),
                buildBook("Thinking, Fast and Slow", "Daniel Kahneman", "Psychology",
                        "Two systems that drive the way we think.",
                        "psychology,behavior,decision", "https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg", 5, false),
                buildBook("The Minimalist Entrepreneur", "Sahil Lavingia", "Business",
                        "How great founders do more with less.",
                        "business,founder,indie", "https://covers.openlibrary.org/b/isbn/9780525549022-L.jpg", 4, false)
        );
        bookRepository.saveAll(books);
    }

    private Book buildBook(String title, String author, String category, String description,
                           String keywords, String coverUrl, int copies, boolean featured) {
        Book book = new Book();
        book.setTitle(title);
        book.setAuthor(author);
        book.setCategory(category);
        book.setDescription(description);
        book.setKeywords(keywords);
        book.setCoverUrl(coverUrl);
        book.setCopiesTotal(copies);
        book.setCopiesAvailable(copies);
        book.setFeatured(featured);
        return book;
    }
}
