module.exports = (sequelize, DataTypes) => {
    const Price = sequelize.define(
      "priceRecord",
      {
      
        product_name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        competitor_name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          defaultValue: "carrefour"
        },
        competitor_url: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        date_scraped: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      },
      {
        indexes: [
          {
            name: "idx_product",
            fields: ["product_name"]
          },
          {
            name: "idx_competitor",
            fields: ["competitor_name"]
          },
          {
            name: "idx_date",
            fields: ["date_scraped"]
          }
        ],
        timestamps: false 
      }
    );
  
    return Price;
  };