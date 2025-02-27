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
          unique: true,
        },
        current_price: {
          type: DataTypes.FLOAT,
          allowNull: false,
        },
        previousPrice: {
          type: DataTypes.FLOAT,
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
  