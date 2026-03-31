package com.group5.backend.model.entity;

//import jakarta.persistence.*;
import jakarta.persistence.*;

//import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "trade_history")
public class TradeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stock_name")
    private String stockName;

    @Column(name = "symbol")
    private String symbol;

    @Column(name = "type")
    private String type; // 直接用 String 接收，不需要 Enum 转换

    @Column(name = "price")
    private BigDecimal price;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    @Column(name = "order_time")
    private LocalDateTime orderTime;

        // Getter 和 Setter

    public String getStockName() { return stockName; }
    public String getSymbol() { return symbol; }
    public String getType() { return type; }
    public BigDecimal getPrice() { return price; }
    public Integer getQuantity() { return quantity; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public LocalDateTime getOrderTime() { return orderTime; }

}
