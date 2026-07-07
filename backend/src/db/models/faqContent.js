// db/models/faqContent.js
// 单行 JSON 表(始终 id=1)。
// 角色:FaqPage 的 standards / faqs / science / diy。

module.exports = (sequelize, DataTypes) => {
  const FaqContent = sequelize.define(
    'FaqContent',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      tableName: 'faq_content',
      timestamps: true,
      updatedAt: 'updated_at',
      createdAt: false,
    }
  );
  return FaqContent;
};