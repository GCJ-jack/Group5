package com.group5.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.*;

//@Builder
//@Getter
//@Setter
//@AllArgsConstructor
//@NoArgsConstructor
@Entity
public class PortfolioItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String ticker;
    private int quantity;

    public PortfolioItem() {}

    public PortfolioItem(String ticker, int quantity) {
        this.ticker = ticker;
        this.quantity = quantity;
    }

    public Long getId() { return id; }

    public String getTicker() { return ticker; }

    public void setTicker(String ticker) { this.ticker = ticker; }

    public int getQuantity() { return quantity; }

    public void setQuantity(int quantity) { this.quantity = quantity; }
}
