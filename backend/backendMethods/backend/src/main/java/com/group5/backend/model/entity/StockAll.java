package com.group5.backend.model.entity;

import jakarta.persistence.*;
import lombok.Data;

import lombok.Data;
//import javax.persistence.*;

@Data
@Entity // 标记为 JPA 实体，对应数据库表
@Table(name = "stock_all") // 指定数据库表名
public class StockAll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 主键自增
    private Long id;

    @Column(nullable = false, unique = true) // 股票代码不能重复
    private String symbol;

    private String description; // 描述
    private String displaySymbol; // 显示名称
    private String type; // 类型 (etf/stock)
    private String currency; // 货币
}


