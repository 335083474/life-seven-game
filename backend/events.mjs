import {TEST_RULESET} from './settings.mjs';
export const chapters = [
  ['命运初启', '7岁'], ['少年抉择', '14—18岁'], ['青春远行', '19—24岁'],
  ['立业之初', '25—32岁'], ['人生交汇', '33—42岁'], ['盛衰离别', '43—55岁'], ['余生', '60岁以后']
];
// Separate marriage/birth and crisis/bereavement; each meaningful fixed event
// leaves one free action and one black swan. The opening draw is not a round.
export const rounds = [
  {id:'school', stage:1, age:18, title:'下一站，去往哪里？', choices:[['国内院校','求知问学','知识'],['艺术院校','让想象有一个归处','梦想'],['国外院校','走向陌生的远方','阅历'],['辍学','先一步进入真实世界','自由']]},
  {id:'youth', stage:2, age:22, title:'在青春里留下什么？', choices:[['活动社团','参与舞台与创作','才艺'],['外交社团','学习与世界交谈','勇气'],['学习社团','沉入知识的深处','知识'],['不参加社团','把时间还给自己','自由']]},
  {id:'career', stage:3, age:28, title:'第一次独自面对世界', choices:[['自主创业','由自己掌握方向','勇气'],['发展中公司','在变化中积累经验','技能'],['稳定单位','建立生活秩序','沉稳'],['自由职业','选择另一种工作方式','自由']]},
  {id:'marriage', stage:4, age:34, title:'与谁共度此生？', choices:[['相亲','认真认识一位同行者'],['等待真爱','给相遇留一些时间'],['拒绝结婚','选择独立的生活']]},
  {id:'birth', stage:4, age:38, title:'是否迎接一个孩子？', choices:[['要孩子','为新的生命留下位置'],['不生孩子','用另一种方式安排生活']]},
  {id:'crisis', stage:5, age:46, title:'事业的风浪之后', choices:[['继续坚持','承担决定带来的代价','毅力'],['另起炉灶','为新的道路鼓起勇气','勇气']]},
  {id:'parents', stage:5, age:55, title:'父母离开了', choices:[['记住这份爱','父母已经去世，留下的支持与回忆各有归处']]},
  {id:'independence', stage:6, age:61, title:'孩子走向自己的生活', choices:[['送他独立远行','亲情还在，日常养育进入新的阶段']]},
  {id:'oldage', stage:6, age:68, title:'此后的时间，留给什么？', choices:[['安享晚年','在平静中修养身心','修养'],['陪伴亲友','把日子留给重要的人','快乐'],['退而不休','继续留下经验与价值','尊重'],['再追旧梦','拾起多年未竟的心愿','梦想'],['回馈社会','把曾接受的善意传下去','善良']]}
];
export function fixedEvent(life) {
  const event = structuredClone(rounds[life.round]),adult=life.rulesSnapshot?.adultAge||TEST_RULESET.adultAge;
  if (!event) return null;
  if (event.id === 'youth' && life.path === '辍学') {
    event.title = '在社会中历练';
    event.choices = [['拜师学艺','掌握实际谋生的本领','技能'],['进入职场打工','在现实中磨炼','毅力'],['销售与商业活动','接触不同的人','人脉'],['尝试自主创业','探索独立发展的道路','勇气']];
  }
  if (event.id === 'marriage' && life.married) {
    event.title = '已经相守，如何继续同行？';
    event.choices = [['继续经营婚姻','记住当初的选择'],['结束婚姻','认真面对分别的代价']];
  }
  if (event.id === 'birth' && life.child) {
    event.title = childAge(life)>=adult?'陪伴已成年的孩子':'陪伴孩子成长';
    event.choices = [[childAge(life)>=adult?'尊重孩子的独立':'继续养育','不重复生育或赠送孩子与快乐']];
  } else if (event.id === 'birth' && !life.married) {
    event.title = '安排此后生活';
    event.choices = [['继续独立生活','这一回合不强制结婚或生育']];
  }
  if (event.id === 'independence' && !life.child) {
    event.title = '人生走到新的路口';
    event.choices = [['重新安排生活','没有孩子离家，也不扣除不存在的孩子卡']];
  } else if(event.id==='independence'&&life.child.independent){
    event.title='亲情的另一种陪伴';event.choices=[['尊重独立生活','孩子早已独立，亲情依然延续']];
  } else if(event.id==='independence'&&childAge(life)<adult){
    event.title='孩子仍在成长';event.choices=[['继续陪伴成长','孩子尚未成年，不会被强制安排离家']];
  }
  if(event.id==='parents'&&!life.parentsAlive){event.title='记住父母留下的爱';event.choices=[['珍惜留下的记忆','离世已经记录，不会再次发生或重复扣牌']];}
  if(event.id==='crisis')event.title=({'自主创业':'创业路上的风浪','自由职业':'自由职业的转折','发展中公司':'工作中的变局','稳定单位':'熟悉生活中的变局'}[life.career]||'人生路上的风浪');
  return event;
}
export const childAge=life=>life.child?Math.max(0,(rounds[life.round]?.age||7)-life.child.bornAge):null;
// Eligibility is data, fixed before rolling, never an AI afterthought.
export const swans = [
  {id:'illness', title:'一场疾病', health:true, joint:false, text:'一场突如其来的疾病打乱生活。'},
  {id:'injury', title:'意外的伤痛', health:true, joint:false, text:'意外受伤，让原先的生活需要重新安排。'},
  {id:'strain', title:'身心承压', health:true, joint:false, text:'长期积累的压力在这一刻显现。'},
  {id:'couple-illness', title:'共同面对的病痛', health:true, joint:true, text:'同一场疾病影响了你与配偶。'},
  {id:'upheaval', title:'时代的逆风', health:false, joint:false, text:'外部环境突然变化，一份原有的人生资源受到冲击。'},
  {id:'separation', title:'关系的变动', health:false, joint:false, text:'一次无法预料的关系变化，让某种依靠远去。'},
  {id:'child-estrangement', title:'漫长的亲子失联', health:false, joint:false, childChain:true, text:'一场持续的亲子失联改变了日常陪伴，也冲击了快乐。孩子仍然健在，亲子关系仍被记录。'}
];
