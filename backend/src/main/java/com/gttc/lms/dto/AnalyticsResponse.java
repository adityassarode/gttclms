package com.gttc.lms.dto;

import java.util.List;

public class AnalyticsResponse {
    private List<MetricPoint> topBorrowed;
    private List<MetricPoint> categoryPopularity;
    private List<TrendPoint> borrowTrends;
    private List<TrendPoint> reserveTrends;

    public List<MetricPoint> getTopBorrowed() {
        return topBorrowed;
    }

    public void setTopBorrowed(List<MetricPoint> topBorrowed) {
        this.topBorrowed = topBorrowed;
    }

    public List<MetricPoint> getCategoryPopularity() {
        return categoryPopularity;
    }

    public void setCategoryPopularity(List<MetricPoint> categoryPopularity) {
        this.categoryPopularity = categoryPopularity;
    }

    public List<TrendPoint> getBorrowTrends() {
        return borrowTrends;
    }

    public void setBorrowTrends(List<TrendPoint> borrowTrends) {
        this.borrowTrends = borrowTrends;
    }

    public List<TrendPoint> getReserveTrends() {
        return reserveTrends;
    }

    public void setReserveTrends(List<TrendPoint> reserveTrends) {
        this.reserveTrends = reserveTrends;
    }

    public static class MetricPoint {
        private String label;
        private long value;

        public MetricPoint() {
        }

        public MetricPoint(String label, long value) {
            this.label = label;
            this.value = value;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public long getValue() {
            return value;
        }

        public void setValue(long value) {
            this.value = value;
        }
    }

    public static class TrendPoint {
        private String label;
        private long value;

        public TrendPoint() {
        }

        public TrendPoint(String label, long value) {
            this.label = label;
            this.value = value;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public long getValue() {
            return value;
        }

        public void setValue(long value) {
            this.value = value;
        }
    }
}
