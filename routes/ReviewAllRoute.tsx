
import { useNavigate } from 'react-router-dom';
import { ReviewAllScreen } from '../components/ReviewAllScreen';
import { useFlashcards } from '../hooks/useFlashcards';

export default function ReviewAllRoute() {
    const navigate   = useNavigate();
    const flashcards = useFlashcards();

    const allColumns = Array.from(new Set(flashcards.allFlashcards.flatMap((card) => {
        const terms     = (card as any).terms;
        const mcqData   = (card as any).mcqData;
        const clozeData = (card as any).clozeData;
        const cols: string[] = [];
        if (terms) cols.push(...Object.keys(terms));
        if (mcqData) {
            if (mcqData.question) cols.push(...Object.keys(mcqData.question));
            if (mcqData.answer)   cols.push(...Object.keys(mcqData.answer));
        }
        if (clozeData?.text) cols.push(...Object.keys(clozeData.text));
        if (cols.length === 0) {
            Object.keys(card).forEach(key => {
                if (!['id', 'type', 'srsData', 'mnemonic'].includes(key)) cols.push(key);
            });
        }
        return cols;
    })));

    return (
        <ReviewAllScreen
            cards={flashcards.allFlashcards}
            allColumns={allColumns}
            onBack={() => navigate('/setup')}
            onHome={() => navigate('/')}
        />
    );
}
