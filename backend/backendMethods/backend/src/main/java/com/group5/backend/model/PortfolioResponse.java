package com.group5.backend.model;

import java.time.LocalDateTime;

public class PortfolioResponse {

    public Long id;
    public String name;
    public String ticker;
    public String type;
    public int quantity;
    public double price;
    public LocalDateTime time;
    public double totalValue;

    public PortfolioResponse(Long id, String name, String ticker, String type,
                             int quantity, double price, LocalDateTime time) {
        this.id = id;
        this.name = name;
        this.ticker = ticker;
        this.type = type;
        this.quantity = quantity;
        this.price = price;
        this.time = time;
        this.totalValue = quantity * price;
    }
}