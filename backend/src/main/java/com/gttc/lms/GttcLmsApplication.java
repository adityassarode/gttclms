package com.gttc.lms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GttcLmsApplication {
    public static void main(String[] args) {
        SpringApplication.run(GttcLmsApplication.class, args);
    }
}
