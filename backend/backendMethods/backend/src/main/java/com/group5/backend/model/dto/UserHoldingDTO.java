package com.group5.backend.model.dto;

import java.math.BigDecimal;

public class UserHoldingDTO {
    private Long id;
    private String symbol;
    private String stockName;
    private String assetType;
    private Integer quantity;
    private BigDecimal avgCost;
    private BigDecimal currentPrice;
    private BigDecimal totalValue;
    private BigDecimal profitLoss; // 浮盈浮亏
    private BigDecimal profitLossRate; // 盈亏率

    // Getters and Setters (省略)

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getStockName() {
        return stockName;
    }

    public void setStockName(String stockName) {
        this.stockName = stockName;
    }

    public String getAssetType() {
        return assetType;
    }

    public void setAssetType(String assetType) {
        this.assetType = assetType;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getAvgCost() {
        return avgCost;
    }

    public void setAvgCost(BigDecimal avgCost) {
        this.avgCost = avgCost;
    }

    public BigDecimal getCurrentPrice() {
        return currentPrice;
    }

    public void setCurrentPrice(BigDecimal currentPrice) {
        this.currentPrice = currentPrice;
    }

    public BigDecimal getTotalValue() {
        return totalValue;
    }

    public void setTotalValue(BigDecimal totalValue) {
        this.totalValue = totalValue;
    }

    public BigDecimal getProfitLoss() {
        return profitLoss;
    }

    public void setProfitLoss(BigDecimal profitLoss) {
        this.profitLoss = profitLoss;
    }

    public BigDecimal getProfitLossRate() {
        return profitLossRate;
    }

    public void setProfitLossRate(BigDecimal profitLossRate) {
        this.profitLossRate = profitLossRate;
    }
}


