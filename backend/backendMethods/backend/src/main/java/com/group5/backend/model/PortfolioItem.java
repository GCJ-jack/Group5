package com.group5.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class PortfolioItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String ticker;
    private int quantity;
    private LocalDateTime time;

    public PortfolioItem() {
    }

    public PortfolioItem(String ticker, int quantity) {
        this.ticker = ticker;
        this.quantity = quantity;
        this.time = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public LocalDateTime getTime() {
        return time;
    }

    public void setTime(LocalDateTime time) {
        this.time = time;
    }
}