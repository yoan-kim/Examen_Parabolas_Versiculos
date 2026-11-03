import React, { useState } from 'react';
import { StickyNote, X, Trash2, Check, Edit3 } from 'lucide-react';
import { AppLanguage, QUESTIONS } from '../data/questions';
import { UI_STRINGS } from '../data/i18n';

interface NotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
  studyNotes: Record<number, string>;
  onSaveNote: (questionId: number, noteText: string) => void;
}

export const NotebookModal: React.FC<NotebookModalProps> = ({
  isOpen,
  onClose,
  language,
  studyNotes,
  onSaveNote
}) => {
  const isKo = language === 'ko';
  const t = UI_STRINGS[language];

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');

  if (!isOpen) return null;

  const notedQuestions = QUESTIONS.filter(
    (q) => studyNotes[q.id] && studyNotes[q.id].trim().length > 0
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-indigo-50/40">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-indigo-600" />
              <h3 className="font-display text-lg font-bold text-slate-900">
                {t.notebookModalTitle} ({notedQuestions.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500">{t.notebookModalSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {notedQuestions.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
              <StickyNote className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                {t.notebookModalEmpty}
              </p>
            </div>
          ) : (
            notedQuestions.map((q) => {
              const isEditing = editingId === q.id;
              const noteContent = studyNotes[q.id] || '';

              return (
                <div
                  key={q.id}
                  className="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-white hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400 font-mono-tabular">
                    <div>
                      <span className="font-bold text-slate-900">{q.code}</span>
                      <span className="mx-1.5">·</span>
                      <span>{isKo ? q.chapterTitleKo : q.chapterTitleEs}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(q.id);
                            setEditDraft(noteContent);
                          }}
                          className="px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isKo ? '수정' : 'Editar'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onSaveNote(q.id, '');
                          if (editingId === q.id) setEditingId(null);
                        }}
                        className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t.btnDeleteNote}</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-sm font-bold text-slate-900">
                    {isKo ? q.questionKo : q.questionEs}
                  </div>
                  <div className="text-sm font-bold text-[#0284C7]">
                    {isKo ? q.answerKo : q.answerEs}{' '}
                    <span className="font-mono-tabular text-xs text-slate-500 font-normal">
                      ({isKo ? q.verseKo : q.verseEs})
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={3}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-indigo-50/40 border border-indigo-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs font-medium border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          {t.btnCloseModal}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSaveNote(q.id, editDraft.trim());
                            setEditingId(null);
                          }}
                          className="px-3.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{t.btnSaveNote}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="advanced-note-panel p-3 text-xs sm:text-sm text-indigo-950 whitespace-pre-wrap leading-relaxed">
                      {noteContent}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            {t.btnCloseModal}
          </button>
        </div>
      </div>
    </div>
  );
};
