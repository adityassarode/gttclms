package com.gttc.lms.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String mode;
    private final String from;

    public EmailService(JavaMailSender mailSender,
                        @Value("${app.mail.mode}") String mode,
                        @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender;
        this.mode = mode;
        this.from = from;
    }

    public void send(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            return;
        }
        if (!"smtp".equalsIgnoreCase(mode)) {
            logger.info("Email to {} subject '{}' body: {}", to, subject, body);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    public void sendHtml(String to, String subject, String htmlBody) {
        if (to == null || to.isBlank()) {
            return;
        }
        if (!"smtp".equalsIgnoreCase(mode)) {
            logger.info("Email to {} subject '{}' body: {}", to, subject, htmlBody);
            return;
        }
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(mime);
        } catch (Exception ex) {
            logger.warn("Failed to send email", ex);
        }
    }
}
