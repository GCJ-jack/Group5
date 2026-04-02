package com.group5.backend.model.dto;

public class StockSymbolDto {
    public String symbol;
    public String description;
    public String displaySymbol;
    public String type;
    public String currency;
    // 其他字段如 figi, micfigi 等如果需要可以自行添加

    // 默认构造函数
    public StockSymbolDto() {
    }
}
