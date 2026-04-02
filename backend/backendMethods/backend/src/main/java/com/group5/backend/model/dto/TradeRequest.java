package com.group5.backend.model.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class TradeRequest {
    private String symbol;      // 股票代码 (必须)
    private String stockName;   // 股票名称 (必须)
    private BigDecimal price;   // 当前单价 (由 API 提供)
    private Integer quantity;   // 用户输入的买入数量
    private String assetType;   // 资产类型 (默认 "股票")
    private String type;        // 操作类型 (默认 "BUY")

    // Getters and Setters

    public String getSymbol() {
        return symbol;
    }

    public String getStockName() {
        return stockName;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public String getAssetType() {
        return assetType;
    }

    public String getType() {
        return type;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public void setStockName(String stockName) {
        this.stockName = stockName;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public void setAssetType(String assetType) {
        this.assetType = assetType;
    }

    public void setType(String type) {
        this.type = type;
    }
}
