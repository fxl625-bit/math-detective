/** Finite, grade-aware learning path for the first six-grade release. */
export type LearningGrade = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6';
export type LearningRole = 'foundation' | 'application' | 'advanced' | 'olympiad';
export type LearningMethod =
  | 'representation'
  | 'inverse'
  | 'enumeration'
  | 'pattern'
  | 'equivalence'
  | 'classification'
  | 'spatial'
  | 'optimization';

export interface LearningUnit {
  id: string;
  grade: LearningGrade;
  title: string;
  domain: string;
  order: number;
  skillKeys: string[];
  prerequisiteUnitIds: string[];
  methods: LearningMethod[];
  semester: 'upper' | 'lower' | 'both';
}

const units: LearningUnit[] = [
  { id: 'g1-u1', grade: 'G1', title: '20以内数与加减', domain: '数与运算', order: 1, skillKeys: ['g1-u1:add-within-20', 'g1-u1:subtract-within-20'], prerequisiteUnitIds: [], methods: ['representation', 'inverse'], semester: 'both' },
  { id: 'g1-u2', grade: 'G1', title: '100以内数与加减', domain: '数与运算', order: 2, skillKeys: ['g1-u2:number-place-value-100', 'g1-u2:add-subtract-100'], prerequisiteUnitIds: ['g1-u1'], methods: ['representation', 'pattern'], semester: 'both' },
  { id: 'g1-u3', grade: 'G1', title: '比较与未知量', domain: '数量关系', order: 3, skillKeys: ['g1-u3:compare-difference', 'g1-u3:find-unknown'], prerequisiteUnitIds: ['g1-u1'], methods: ['representation', 'inverse'], semester: 'both' },
  { id: 'g1-u4', grade: 'G1', title: '认识图形与位置', domain: '空间', order: 4, skillKeys: ['g1-u4:plane-shape-features', 'g1-u4:classify-shapes'], prerequisiteUnitIds: [], methods: ['spatial', 'classification'], semester: 'both' },
  { id: 'g1-u5', grade: 'G1', title: '时间与人民币初步', domain: '测量应用', order: 5, skillKeys: ['g1-u5:rmb-yuan-jiao', 'g1-u5:time-and-quantity'], prerequisiteUnitIds: ['g1-u1'], methods: ['representation', 'inverse'], semester: 'both' },
  { id: 'g1-u6', grade: 'G1', title: '分类、规律与有序思考', domain: '思维', order: 6, skillKeys: ['g1-u6:repeat-pattern', 'g1-u6:ordered-enumeration'], prerequisiteUnitIds: [], methods: ['pattern', 'enumeration', 'classification'], semester: 'both' },

  { id: 'g2-u1', grade: 'G2', title: '乘法意义与口诀', domain: '数与运算', order: 1, skillKeys: ['g2-u1:equal-groups', 'g2-u1:table-facts'], prerequisiteUnitIds: ['g1-u1', 'g1-u2'], methods: ['representation', 'pattern'], semester: 'both' },
  { id: 'g2-u2', grade: 'G2', title: '平均分与除法', domain: '数与运算', order: 2, skillKeys: ['g2-u2:equal-sharing', 'g2-u2:find-number-of-groups'], prerequisiteUnitIds: ['g2-u1'], methods: ['representation', 'inverse'], semester: 'both' },
  { id: 'g2-u3', grade: 'G2', title: '百以内计算与两步应用', domain: '数量关系', order: 3, skillKeys: ['g2-u3:add-subtract-within-100', 'g2-u3:two-step-word-problems'], prerequisiteUnitIds: ['g1-u2', 'g2-u1', 'g2-u2'], methods: ['representation', 'inverse'], semester: 'both' },
  { id: 'g2-u4', grade: 'G2', title: '长度、时间与单位', domain: '测量', order: 4, skillKeys: ['g2-u4:length-units', 'g2-u4:elapsed-time'], prerequisiteUnitIds: ['g1-u5'], methods: ['representation', 'classification'], semester: 'both' },
  { id: 'g2-u5', grade: 'G2', title: '图形与空间观察', domain: '空间', order: 5, skillKeys: ['g2-u5:shape-features', 'g2-u5:spatial-relations'], prerequisiteUnitIds: ['g1-u4'], methods: ['spatial', 'classification'], semester: 'both' },
  { id: 'g2-u6', grade: 'G2', title: '规律、枚举与等量', domain: '思维', order: 6, skillKeys: ['g2-u6:cycle-pattern', 'g2-u6:enumeration-equivalence'], prerequisiteUnitIds: ['g1-u6', 'g2-u1'], methods: ['pattern', 'enumeration', 'equivalence'], semester: 'both' },

  { id: 'g3-u1', grade: 'G3', title: '多位数乘除', domain: '数与运算', order: 1, skillKeys: ['g3-u1:multi-digit-multiplication', 'g3-u1:division-with-remainders'], prerequisiteUnitIds: ['g2-u1', 'g2-u2', 'g2-u3'], methods: ['representation', 'inverse'], semester: 'both' },
  { id: 'g3-u2', grade: 'G3', title: '两步关系与逆向', domain: '数量关系', order: 2, skillKeys: ['g3-u2:two-step-word-models', 'g3-u2:inverse-unknowns'], prerequisiteUnitIds: ['g2-u3'], methods: ['representation', 'inverse'], semester: 'both' },
  { id: 'g3-u3', grade: 'G3', title: '分数和小数初步', domain: '数与运算', order: 3, skillKeys: ['g3-u3:unit-fractions', 'g3-u3:tenths-as-decimals'], prerequisiteUnitIds: ['g2-u3'], methods: ['representation', 'equivalence'], semester: 'both' },
  { id: 'g3-u4', grade: 'G3', title: '周长与面积', domain: '测量空间', order: 4, skillKeys: ['g3-u4:rectangle-perimeter', 'g3-u4:area-by-tiling'], prerequisiteUnitIds: ['g2-u5'], methods: ['spatial', 'representation'], semester: 'both' },
  { id: 'g3-u5', grade: 'G3', title: '时间、质量与单位应用', domain: '测量', order: 5, skillKeys: ['g3-u5:elapsed-time', 'g3-u5:mass-capacity-units'], prerequisiteUnitIds: ['g2-u4'], methods: ['representation', 'classification'], semester: 'both' },
  { id: 'g3-u6', grade: 'G3', title: '数据分类与组合规律', domain: '思维数据', order: 6, skillKeys: ['g3-u6:read-data-tables', 'g3-u6:systematic-combinations'], prerequisiteUnitIds: ['g2-u6'], methods: ['classification', 'enumeration', 'pattern'], semester: 'both' },

  { id: 'g4-u1', grade: 'G4', title: '大数与四则关系', domain: '数与运算', order: 1, skillKeys: ['g4-u1:place-value-to-10000', 'g4-u1:four-operation-word-problems'], prerequisiteUnitIds: ['g3-u1', 'g3-u2'], methods: ['representation', 'inverse'], semester: 'both' },
  { id: 'g4-u2', grade: 'G4', title: '多位数乘除与运算规律', domain: '运算推理', order: 2, skillKeys: ['g4-u2:multi-digit-products', 'g4-u2:operation-properties'], prerequisiteUnitIds: ['g3-u1'], methods: ['pattern', 'equivalence'], semester: 'both' },
  { id: 'g4-u3', grade: 'G4', title: '小数意义与加减', domain: '数与运算', order: 3, skillKeys: ['g4-u3:decimal-place-value', 'g4-u3:add-subtract-decimals'], prerequisiteUnitIds: ['g3-u3'], methods: ['representation', 'equivalence'], semester: 'both' },
  { id: 'g4-u4', grade: 'G4', title: '角、三角形与空间', domain: '空间', order: 4, skillKeys: ['g4-u4:measure-angles', 'g4-u4:classify-triangles'], prerequisiteUnitIds: ['g3-u4'], methods: ['spatial', 'classification'], semester: 'both' },
  { id: 'g4-u5', grade: 'G4', title: '数据图表与平均数', domain: '数据', order: 5, skillKeys: ['g4-u5:read-data-charts', 'g4-u5:calculate-mean'], prerequisiteUnitIds: ['g3-u6'], methods: ['classification', 'representation'], semester: 'both' },
  { id: 'g4-u6', grade: 'G4', title: '行程、周期与优化入门', domain: '综合思维', order: 6, skillKeys: ['g4-u6:distance-time-relations', 'g4-u6:cycle-optimization'], prerequisiteUnitIds: ['g3-u2', 'g3-u6'], methods: ['pattern', 'classification', 'optimization'], semester: 'both' },

  { id: 'g5-u1', grade: 'G5', title: '小数乘除与应用', domain: '数与运算', order: 1, skillKeys: ['g5-u1:multiply-decimals', 'g5-u1:divide-decimals'], prerequisiteUnitIds: ['g4-u3'], methods: ['representation', 'equivalence'], semester: 'both' },
  { id: 'g5-u2', grade: 'G5', title: '因数倍数与整除', domain: '数论思维', order: 2, skillKeys: ['g5-u2:identify-factors-multiples', 'g5-u2:divisibility-patterns'], prerequisiteUnitIds: ['g4-u1', 'g4-u2'], methods: ['pattern', 'enumeration'], semester: 'both' },
  { id: 'g5-u3', grade: 'G5', title: '分数意义与加减', domain: '数与运算', order: 3, skillKeys: ['g5-u3:equivalent-fractions', 'g5-u3:add-subtract-fractions'], prerequisiteUnitIds: ['g3-u3'], methods: ['representation', 'equivalence'], semester: 'both' },
  { id: 'g5-u4', grade: 'G5', title: '多边形面积与立体初步', domain: '空间测量', order: 4, skillKeys: ['g5-u4:polygon-area', 'g5-u4:volume-by-unit-cubes'], prerequisiteUnitIds: ['g3-u4', 'g4-u4'], methods: ['spatial', 'representation'], semester: 'both' },
  { id: 'g5-u5', grade: 'G5', title: '简单方程与数量关系', domain: '关系', order: 5, skillKeys: ['g5-u5:solve-one-step-equations', 'g5-u5:translate-quantity-relations'], prerequisiteUnitIds: ['g4-u1', 'g4-u3'], methods: ['equivalence', 'inverse'], semester: 'both' },
  { id: 'g5-u6', grade: 'G5', title: '数据、可能性与有序枚举', domain: '思维数据', order: 6, skillKeys: ['g5-u6:interpret-data', 'g5-u6:systematic-enumeration'], prerequisiteUnitIds: ['g4-u5', 'g4-u6'], methods: ['classification', 'enumeration', 'optimization'], semester: 'both' },

  { id: 'g6-u1', grade: 'G6', title: '分数乘除与综合应用', domain: '数与运算', order: 1, skillKeys: ['g6-u1:multiply-fractions', 'g6-u1:divide-fractions'], prerequisiteUnitIds: ['g5-u3', 'g5-u5'], methods: ['representation', 'inverse', 'equivalence'], semester: 'both' },
  { id: 'g6-u2', grade: 'G6', title: '比和比例', domain: '数量关系', order: 2, skillKeys: ['g6-u2:equivalent-ratios', 'g6-u2:solve-proportions'], prerequisiteUnitIds: ['g5-u1', 'g5-u3'], methods: ['representation', 'equivalence'], semester: 'both' },
  { id: 'g6-u3', grade: 'G6', title: '百分数与实际问题', domain: '数量关系', order: 3, skillKeys: ['g6-u3:percent-of-quantity', 'g6-u3:percent-change'], prerequisiteUnitIds: ['g5-u1', 'g5-u5'], methods: ['representation', 'inverse'], semester: 'both' },
  { id: 'g6-u4', grade: 'G6', title: '圆与立体量度', domain: '空间测量', order: 4, skillKeys: ['g6-u4:circle-circumference', 'g6-u4:circle-area-volume'], prerequisiteUnitIds: ['g5-u4'], methods: ['spatial', 'representation'], semester: 'both' },
  { id: 'g6-u5', grade: 'G6', title: '数据表达与解释', domain: '数据', order: 5, skillKeys: ['g6-u5:read-data-representations', 'g6-u5:interpret-statistics'], prerequisiteUnitIds: ['g5-u6'], methods: ['classification', 'representation'], semester: 'both' },
  { id: 'g6-u6', grade: 'G6', title: '综合推理与最优策略', domain: '思维', order: 6, skillKeys: ['g6-u6:multi-step-modeling', 'g6-u6:choose-optimal-strategy'], prerequisiteUnitIds: ['g5-u2', 'g5-u5', 'g5-u6'], methods: ['enumeration', 'equivalence', 'optimization'], semester: 'both' },
];

export const learningUnits: readonly LearningUnit[] = units;




