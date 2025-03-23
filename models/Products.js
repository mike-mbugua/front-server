module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define(
      "Product",
      {
        
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        url: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: false,
        },
        currentPrice: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        newPrice: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        competitorName: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        lastChecked: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        last_updated: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
        },
      },
      {
        tableName: "products",
        timestamps: true, 
      }
    );
  
    return Product;
  };
  