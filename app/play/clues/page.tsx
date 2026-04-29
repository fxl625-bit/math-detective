'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, Star } from 'lucide-react';
import Link from 'next/link';
import { questions } from '@/data/questions';
import { useGameState } from '@/hooks/useGameState';
import Confetti from '@/components/Confetti';
import FeedbackOverlay from '@/components/FeedbackOverlay';
import DetectiveMascot from '@/components/DetectiveMascot';
import { getRandomEncouragement } from '@/data/levels';

interface QuestionBlock {
  text: string;
  type: 'number' | 'keyword' | 'question' | 'normal';
  found: boolean;
}

export default function FindCluesPage() {
  const router = useRouter();
  const { state, completeQuestion } = useGameState();
  const [q] = useState(() => {
    const undone = questions.filter((q) => !state.completedQuestions.includes(q.id));
    if (undone.length === 0) return questions[Math.floor(Math.random() * questions.length)];
    return undone[Math.floor(Math.random() * undone.length)];
  });

  const [blocks, setBlocks] = useState<QuestionBlock[]>(() => {
    const result: QuestionBlock[] = [];
    // Build blocks from usefulPhrases and noisePhrases
    const useful = q.usefulPhrases;
    const noise = q.noisePhrases;

    // Reconstruct text as blocks
    let remaining = q.text;
    const allPhrases = [...useful, ...noise].sort(() => Math.random());

    // Simple approach: split by phrases we know
    const knownPhrases = [...useful, ...noise];
    // Actually, let's use a simpler approach: split by segments
    const segments = splitTextIntoBlocks(q);
    return segments;
  });

  const [foundBlocks, setFoundBlocks] = useState<Set<number>>(new Set());
  const [showNumbers, setShowNumbers] = useState(false);
  const [numberCount, setNumberCount] = useState(0);
  const [showEquation, setShowEquation] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{
    show: boolean;
    type: 'success' | 'hint' | 'info';
    message: string;
  }>({ show: false, type: 'info', message: '' });
  const [showConfetti, setShowConfetti] = useState(false);
  const [phase, setPhase] = useState<'find' | 'numbers' | 'equation' | 'done'>('find');
  const [shakeInput, setShakeInput] = useState(false);

  const allCluesFound = blocks.filter((b) => b.type !== 'normal').every((_b, i) => {
    const globalIdx = blocks.findIndex(
      (block, bi) => block.type !== 'normal' && blocks.slice(0, bi).filter((b) => b.type !== 'normal').length === blocks.slice(0, i).filter((b) => b.type !== 'normal').length
    );
    return foundBlocks.has(i);
  });

  // Recalculate: get indices of clue blocks
  const clueIndices = blocks
    .map((b, i) => (b.type !== 'normal' ? i : -1))
    .filter((i) => i >= 0);
  const allFound = clueIndices.every((i) => foundBlocks.has(i));

  function handleBlockClick(idx: number) {
    if (phase !== 'find') return;
    const block = blocks[idx];
    if (block.type === 'normal') {
      setFeedback({
        show: true,
        type: 'hint',
        message: '🔍 这段话和数学无关哦，试试找数字和关键词吧！',
      });
      return;
    }

    const newFound = new Set(foundBlocks);
    newFound.add(idx);
    setFoundBlocks(newFound);

    if (block.type === 'number') {
      setNumberCount((c) => c + 1);
      setShowNumbers(true);
    }

    // Check if all clues found
    const remainingClues = clueIndices.filter((i) => !newFound.has(i) && i !== idx);
    if (remainingClues.length === 0) {
      // All found!
      setTimeout(() => {
        setFeedback({
          show: true,
          type: 'success',
          message: '🎉 太棒了！你找到了所有线索！接下来看看数字代表什么吧！',
        });
        setPhase('numbers');
      }, 500);
    } else if (block.type === 'question') {
      setFeedback({
        show: true,
        type: 'info',
        message: `你找到了问题："${block.text}" - 这是在问${q.correctMeaning}哦！`,
      });
    }
  }

  function handleStartEquation() {
    setShowEquation(true);
    setPhase('equation');
  }

  function handleSubmitAnswer() {
    const num = parseInt(userAnswer);
    if (isNaN(num)) {
      setFeedback({ show: true, type: 'hint', message: '请输入一个数字哦～' });
      return;
    }
    if (num === q.answer) {
      setFeedback({
        show: true,
        type: 'success',
        message: getRandomEncouragement(),
      });
      setShowConfetti(true);
      setPhase('done');
      completeQuestion(q.id, true);
    } else {
      setShakeInput(true);
      setFeedback({
        show: true,
        type: 'hint',
        message: `不太对哦～再想一想：${q.explanation}`,
      });
      setTimeout(() => setShakeInput(false), 500);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/play" className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 transition-colors">
          <ArrowLeft size={20} className="text-amber-700" />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold text-amber-800">玩法一：点线索 🔍</h1>
          <p className="text-xs text-gray-500">点击题目中的数字、关键词和问题</p>
        </div>
      </div>

      {/* Detective mascot */}
      <div className="flex justify-center">
        <DetectiveMascot mood={phase === 'done' ? 'excited' : 'thinking'} size="sm" />
      </div>

      {/* Question text with clickable blocks */}
      <div className="card-detective p-5">
        <h3 className="text-sm font-bold text-gray-500 mb-3">📋 题目：点击高亮部分找线索</h3>
        <div className="text-lg leading-relaxed">
          {blocks.map((block, idx) => (
            <motion.span
              key={idx}
              className={`text-block ${
                block.type === 'normal'
                  ? 'noise'
                  : foundBlocks.has(idx)
                    ? 'useful found'
                    : 'useful'
              }`}
              animate={
                foundBlocks.has(idx)
                  ? { scale: [1, 1.1, 1], backgroundColor: ['#fef08a', '#bbf7d0', '#f0fdf4'] }
                  : {}
              }
              onClick={() => handleBlockClick(idx)}
              whileHover={phase === 'find' && !foundBlocks.has(idx) && block.type !== 'normal' ? { scale: 1.05 } : {}}
              whileTap={phase === 'find' ? { scale: 0.95 } : {}}
            >
              {block.text}
              {foundBlocks.has(idx) && block.type === 'number' && (
                <motion.span
                  className="inline-block ml-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  ✅
                </motion.span>
              )}
              {foundBlocks.has(idx) && block.type === 'keyword' && (
                <motion.span
                  className="inline-block ml-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  🔑
                </motion.span>
              )}
              {foundBlocks.has(idx) && block.type === 'question' && (
                <motion.span
                  className="inline-block ml-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  ❓
                </motion.span>
              )}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Clue progress */}
      <div className="card-detective p-3 flex items-center gap-3">
        <span className="text-sm font-bold text-gray-600">线索进度：</span>
        <div className="flex gap-1">
          {clueIndices.map((idx) => (
            <motion.div
              key={idx}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                foundBlocks.has(idx) ? 'bg-green-400 text-white' : 'bg-gray-200'
              }`}
              animate={foundBlocks.has(idx) ? { rotate: [0, 10, -10, 0] } : {}}
              transition={{ duration: 0.3 }}
            >
              {foundBlocks.has(idx) ? '✓' : '?'}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Number visualization */}
      <AnimatePresence>
        {showNumbers && (
          <motion.div
            className="card-detective p-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <h3 className="text-sm font-bold text-gray-600 mb-3">
              🎨 来看看这些数字长什么样：
            </h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {q.numbers.map((n, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.3, type: 'spring' }}
                >
                  <div className="text-2xl font-extrabold text-amber-600 mb-1">{n}</div>
                  <div className="flex flex-wrap justify-center gap-0.5 max-w-[120px]">
                    {Array.from({ length: n }).map((_, j) => (
                      <motion.span
                        key={j}
                        className="text-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.3 + j * 0.05 }}
                      >
                        {q.category === 'addition' ? '🐰' : '🍎'}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
            {q.operation === 'addition' && (
              <motion.div
                className="text-center mt-2 text-3xl font-extrabold text-orange-500"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: 'spring' }}
              >
                +
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Equation input */}
      <AnimatePresence>
        {showEquation && phase === 'equation' && (
          <motion.div
            className="card-detective p-5 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h3 className="text-lg font-extrabold text-amber-800 mb-3">
              ✏️ 请你写下算式和答案
            </h3>
            <div className="text-2xl font-extrabold text-gray-700 mb-4">
              {q.equation.replace('?', '___')}
            </div>
            <div className={shakeInput ? 'animate-shake' : ''}>
              <input
                type="number"
                inputMode="numeric"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                className="w-24 h-14 text-center text-2xl font-extrabold border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:outline-none bg-amber-50"
                placeholder="?"
                autoFocus
              />
            </div>
            <motion.button
              className="mt-4 px-8 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white font-extrabold text-lg rounded-xl shadow-lg shadow-green-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmitAnswer}
            >
              <Check size={20} className="inline mr-1" />
              提交答案
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Done - next step */}
      {phase === 'done' && (
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="card-detective p-4 bg-green-50 border-green-200">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-lg font-extrabold text-green-700">
              完美破案！
            </div>
            <div className="text-sm text-green-600 mt-1">
              {q.explanation}
            </div>
            <div className="text-xl font-extrabold text-amber-600 mt-2">
              ⭐ +1 星星
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              className="px-6 py-3 bg-amber-400 text-white font-extrabold rounded-xl"
              onClick={() => router.push('/play')}
            >
              返回挑战
            </button>
            <button
              className="px-6 py-3 bg-purple-400 text-white font-extrabold rounded-xl"
              onClick={() => window.location.reload()}
            >
              再来一题
            </button>
          </div>
        </motion.div>
      )}

      {/* Next button when all clues found but equation not yet shown */}
      {allFound && phase === 'numbers' && (
        <motion.button
          className="w-full py-4 bg-gradient-to-r from-blue-400 to-cyan-400 text-white font-extrabold text-lg rounded-2xl shadow-lg"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStartEquation}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ✏️ 开始列算式！
        </motion.button>
      )}

      {/* Feedback overlay */}
      <FeedbackOverlay
        show={feedback.show}
        type={feedback.type}
        message={feedback.message}
        onClose={() => setFeedback((f) => ({ ...f, show: false }))}
      />

      {/* Confetti */}
      <Confetti show={showConfetti} />
    </div>
  );
}

function splitTextIntoBlocks(q: typeof questions[0]): QuestionBlock[] {
  const blocks: QuestionBlock[] = [];
  let text = q.text;

  // Build a list of all known phrases with positions
  const phrases: { text: string; type: QuestionBlock['type']; start: number }[] = [];

  for (const kw of q.keywords) {
    const idx = text.indexOf(kw.word);
    if (idx >= 0) phrases.push({ text: kw.word, type: 'keyword', start: idx });
  }

  for (const n of q.numbers) {
    // Find number patterns in text
    const patterns = [`${n}只`, `${n}个`, `${n}条`, `${n}支`, `${n}朵`, `${n}辆`, `${n}本`, `${n}块`, `${n}颗`, `${n}根`, `${n}张`, `${n}盒`, `${n}瓶`, `${n}片`, `${n}头`, `${n}匹`];
    for (const pat of patterns) {
      const idx = text.indexOf(pat);
      if (idx >= 0 && !phrases.some((p) => p.start === idx)) {
        phrases.push({ text: pat, type: 'number', start: idx });
        break;
      }
    }
  }

  // Find question phrase (ends with ? or ？)
  const qMatch = text.match(/[^。，,]*[？?]/);
  if (qMatch) {
    const idx = text.indexOf(qMatch[0]);
    if (idx >= 0 && !phrases.some((p) => p.start === idx)) {
      phrases.push({ text: qMatch[0], type: 'question', start: idx });
    }
  }

  // Also identify noise phrases
  for (const noise of q.noisePhrases) {
    const idx = text.indexOf(noise);
    if (idx >= 0) phrases.push({ text: noise, type: 'normal', start: idx });
  }

  // Sort by position
  phrases.sort((a, b) => a.start - b.start);

  // Build blocks by splitting text
  let pos = 0;
  for (const p of phrases) {
    if (p.start > pos) {
      const between = text.slice(pos, p.start);
      if (between.trim()) {
        blocks.push({ text: between, type: 'normal', found: false });
      }
    }
    blocks.push({ text: p.text, type: p.type, found: false });
    pos = p.start + p.text.length;
  }

  // Remaining text
  if (pos < text.length) {
    const remaining = text.slice(pos);
    if (remaining.trim()) {
      blocks.push({ text: remaining, type: 'normal', found: false });
    }
  }

  return blocks;
}
