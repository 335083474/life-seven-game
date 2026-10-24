// Authored single-player NPC actions. Their matching/risk reasons are fixed
// before rolling and use the same probability engine as a player action.
export const npcPlans={
  chen:[
    {reward:'知识',goal:'完成一次社区学习课程',risks:['知识','技能']},
    {reward:'技能',goal:'制作一件实用工具',risks:['技能','健康']},
    {reward:'智慧',goal:'整理解决问题的实践经验',risks:['智慧','知识']},
    {reward:'健康',goal:'建立适度锻炼与作息计划',risks:['健康','毅力']},
  ],
  he:[
    {reward:'人脉',goal:'组织一次邻里交流活动',risks:['人脉','才艺']},
    {reward:'快乐',goal:'安排一次与朋友的相聚',risks:['快乐','朋友']},
    {reward:'才艺',goal:'完成一件小型创作',risks:['才艺','快乐']},
    {reward:'善良',goal:'参与一次志愿服务',risks:['善良','人脉']},
  ],
  ye:[
    {reward:'勇气',goal:'尝试一次陌生领域的公开展示',risks:['勇气','阅历']},
    {reward:'财富',goal:'经营一项小规模业务',risks:['财富','技能']},
    {reward:'阅历',goal:'完成一次有准备的远行',risks:['阅历','健康']},
    {reward:'毅力',goal:'持续练习一项有挑战的技能',risks:['毅力','勇气']},
  ],
};
export const npcMatchReason='这项已有资源与预设行动的执行有关。';
export const npcRiskReason='行动严重受挫可能损害这项相关的已有资源。';
