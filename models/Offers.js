module.exports = (sequelize,DataTypes)=>{
    const Offer = sequelize.define('Offer',{
        name:{
            type:DataTypes.STRING,
            allowNull:false
        },
        url:{
            type:DataTypes.STRING,
            allowNull:false
        },
        offerPrice:{
            type:DataTypes.FLOAT,
            allowNull:false
        }
    });
    return Offer;
}