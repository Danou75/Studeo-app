import React from 'react';
import { Flashcard } from '../types';
import { useConjugator } from './conjugator/hooks/useConjugator';
import { ConjugatorHeader } from './conjugator/views/ConjugatorHeader';
import { ConjugatorInput } from './conjugator/views/ConjugatorInput';
import { TranslationResultView } from './conjugator/views/TranslationResultView';
import { ConjugationResultView } from './conjugator/views/ConjugationResultView';
import { LibraryModeView } from './conjugator/views/LibraryModeView';
import { ConjugQuizModalView } from './conjugator/views/ConjugQuizModalView';
import { RepetitorScreen } from './RepetitorScreen';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';
import { FloatingHeaderToggle } from './ui/FloatingHeaderToggle';

interface ConjugatorScreenProps {
    onBack: () => void;
    defaultLang?: string;
    onAddCards?: (cards: Flashcard[]) => void;
    onCreateSet?: (name: string, cards: Flashcard[]) => void;
    onStartQuiz?: (cards: Flashcard[], questionLang: string, answerLang: string) => void;
    onNavigateToSettings?: () => void;
}

export const ConjugatorScreen: React.FC<ConjugatorScreenProps> = ({
    onBack, defaultLang = 'it', onAddCards, onCreateSet, onStartQuiz,
    onNavigateToSettings
}) => {
    const conjugator = useConjugator({
        defaultLang, onAddCards, onCreateSet, onStartQuiz
    });
    const { showHeader, toggleHeader } = useCollapsibleHeader();

    const {
        verb, setVerb, language, setLanguage, mode, setMode, result, setResult,
        translationResult, setTranslationResult, loading, error, setError,
        isExporting, fromCache, setFromCache, showSuggestions, setShowSuggestions,
        suggestions, libraryFilter, setLibraryFilter, librarySearch, setLibrarySearch,
        libraryViewMode, setLibraryViewMode, selectedLibraryKeys, setSelectedLibraryKeys,
        selectedTutorId, setSelectedTutorId, tutorsWithContent,
        showConjugQuizModal, setShowConjugQuizModal, conjQuizData, setConjQuizData,
        repetitorTable, setRepetitorTable, setName, setSetName, isNewSet, setIsNewSet,
        cacheEntries, cacheEntryCount, updateSuggestions, clearAll, deleteEntry,
        toggleLibraryItem, handleConjugate, handleTranslate, handleExport, handleShare,
        handleLaunchLibraryQuiz, handleLaunchConjugQuiz, buildConjugationCards,
        selectedItems, toggleSelection, selectAllTense, handleFormChange, selectedCount,
        handleCreateCards, speak, availableVoices, selectedVoice, setSelectedVoice,
        showVoiceSettings, setShowVoiceSettings, LANGUAGES,
        inputRef, suggestionsRef
    } = conjugator;

    return (
        <div className="flex flex-col h-full bg-background relative animate-fade-in">
            {/* Bouton flottant toggle */}
            <FloatingHeaderToggle showHeader={showHeader} onToggle={toggleHeader} />

            {/* Header — amovible */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
                showHeader ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}>
            <ConjugatorHeader 
                onBack={onBack}
                onNavigateToSettings={onNavigateToSettings}
                mode={mode}
                setMode={setMode}
                cacheEntryCount={cacheEntryCount}
                showVoiceSettings={showVoiceSettings}
                setShowVoiceSettings={setShowVoiceSettings}
                availableVoices={availableVoices}
                selectedVoice={selectedVoice}
                setSelectedVoice={setSelectedVoice}
                speak={speak}
                language={language}
                resultExists={!!result || !!translationResult}
                handleExport={handleExport}
                isExporting={isExporting}
                handleShare={handleShare}
                selectedCount={selectedCount}
                onAddCards={!!onAddCards}
                handleCreateCards={handleCreateCards}
                selectedTutorId={selectedTutorId}
                setSelectedTutorId={setSelectedTutorId}
                tutorsWithContent={tutorsWithContent}
            />
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div 
                    key={mode}
                    className="max-w-[1400px] mx-auto p-4 md:p-6 pb-24 lg:pb-6 relative z-0 space-y-6 md:space-y-8"
                >
                    <ConjugatorInput 
                        mode={mode}
                        verb={verb}
                        setVerb={setVerb}
                        handleConjugate={handleConjugate}
                        handleTranslate={handleTranslate}
                        updateSuggestions={updateSuggestions}
                        language={language}
                        setLanguage={setLanguage}
                        LANGUAGES={LANGUAGES}
                        loading={loading}
                        showSuggestions={showSuggestions}
                        setShowSuggestions={setShowSuggestions}
                        suggestions={suggestions}
                        setMode={setMode}
                        fromCache={fromCache}
                        setResult={setResult}
                        setTranslationResult={setTranslationResult}
                        setError={setError}
                        setFromCache={setFromCache}
                        inputRef={inputRef}
                        suggestionsRef={suggestionsRef}
                    />

                    {error && (
                        <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-xl text-red-500 animate-shake">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-exclamation-circle text-xl"></i>
                                <span className="font-semibold">{error}</span>
                            </div>
                        </div>
                    )}

                    {mode === 'translate' && (
                        <TranslationResultView 
                            translationResult={translationResult}
                            language={language}
                            speak={speak}
                            onAddCards={onAddCards}
                        />
                    )}

                    {mode === 'conjugate' && (
                        <ConjugationResultView 
                            result={result}
                            language={language}
                            LANGUAGES={LANGUAGES}
                            speak={speak}
                            selectAllTense={selectAllTense}
                            setRepetitorTable={setRepetitorTable}
                            sortedFormEntries={conjugator.sortedFormEntries}
                            selectedItems={selectedItems}
                            toggleSelection={toggleSelection}
                            handleFormChange={handleFormChange}
                            selectedCount={selectedCount}
                            isNewSet={isNewSet}
                            setIsNewSet={setIsNewSet}
                            setName={setName}
                            setSetName={setSetName}
                            handleCreateCards={handleCreateCards}
                        />
                    )}

                    <LibraryModeView 
                        mode={mode}
                        libraryFilter={libraryFilter}
                        setLibraryFilter={setLibraryFilter}
                        librarySearch={librarySearch}
                        setLibrarySearch={setLibrarySearch}
                        libraryViewMode={libraryViewMode}
                        setLibraryViewMode={setLibraryViewMode}
                        cacheEntries={cacheEntries}
                        selectedTutorId={selectedTutorId}
                        setSelectedTutorId={setSelectedTutorId}
                        tutorsWithContent={tutorsWithContent}
                        clearAll={clearAll}
                        deleteEntry={deleteEntry}
                        selectedLibraryKeys={selectedLibraryKeys}
                        setSelectedLibraryKeys={setSelectedLibraryKeys}
                        toggleLibraryItem={toggleLibraryItem}
                        onStartQuiz={!!onStartQuiz}
                        onCreateSet={!!onCreateSet}
                        handleLaunchLibraryQuiz={handleLaunchLibraryQuiz}
                        LANGUAGES={LANGUAGES}
                        setVerb={setVerb}
                        setFromCache={setFromCache}
                        setMode={setMode}
                        setResult={setResult}
                        setTranslationResult={setTranslationResult}
                    />
                </div>
            </div>

            {showConjugQuizModal && conjQuizData && (
                 <ConjugQuizModalView 
                     conjQuizData={conjQuizData}
                     showModal={showConjugQuizModal}
                     onClose={() => {
                        setShowConjugQuizModal(false);
                        setConjQuizData(null);
                     }}
                     onLaunch={handleLaunchConjugQuiz}
                     setConjQuizData={setConjQuizData}
                     buildConjugationCards={buildConjugationCards}
                 />
            )}

            {repetitorTable && result && (
                 <div className="absolute inset-0 z-50 bg-background flex flex-col animate-slide-up">
                     <RepetitorScreen
                         verb={result?.verb || ''}
                         language={language}
                         table={repetitorTable}
                         onBack={() => setRepetitorTable(null)}
                     />
                 </div>
            )}
        </div>
    );
};
