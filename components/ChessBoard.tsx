import React from 'react';

export interface ChessBoardProps {
    onSquareClick?: (coord: string) => void;
    status?: Record<string, 'correct' | 'error' | 'active' | 'selected'>;
    pieces?: Record<string, string>;
    arrows?: { from: string; to: string; color?: string }[];
    orientation?: 'white' | 'black';
}

export const ChessBoard: React.FC<ChessBoardProps> = ({ 
    onSquareClick, 
    status = {}, 
    pieces = {}, 
    arrows = [], 
    orientation = 'white' 
}) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    // Si l'orientation est noire, on inverse les rangs et les colonnes
    const displayRanks = orientation === 'white' ? ranks : [...ranks].reverse();
    const displayFiles = orientation === 'white' ? files : [...files].reverse();

    // Map pieces to unicode
    const pieceMap: Record<string, string> = {
        'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };

    // Helper pour calculer les coordonnées SVG d'une case
    const getSquareCenter = (sq: string) => {
        const fileIdx = files.indexOf(sq[0]);
        const rankIdx = ranks.indexOf(sq[1]); // 0 pour 8, 7 pour 1
        
        // Si orientation noire, il faut inverser les index visuels
        const visualFileIdx = orientation === 'white' ? fileIdx : 7 - fileIdx;
        const visualRankIdx = orientation === 'white' ? rankIdx : 7 - rankIdx;
        
        // Les coordonnées sont en % (la grille fait 100x100%)
        // Chaque case fait 12.5% x 12.5%
        // Centre = index * 12.5 + 6.25
        return {
            x: visualFileIdx * 12.5 + 6.25,
            y: visualRankIdx * 12.5 + 6.25
        };
    };

    return (
        <div className="flex flex-col items-center mb-8 relative z-10">   
            <div className="relative bg-[#b58863] p-1 md:p-2 rounded shadow-2xl border-4 border-[#8b4513] select-none">
                <div className="grid grid-cols-8 grid-rows-8 w-64 h-64 md:w-96 md:h-96 relative">
                    {displayRanks.map((rank, rIdx) => (
                        displayFiles.map((file, fIdx) => {
                            const coord = `${file}${rank}`;
                            // Calcul de la couleur : 
                            // En standard (blanc en bas) : a8 (0,0) est blanc. 0+0=0 pair=blanc ? Non, a8 est BLANC.
                            // files index : a=0 (pair). ranks index : 8 => 0 (pair). 0+0=0.
                            // Mais aux échecs, a1 est NOIR. a8 est BLANC.
                            // Attendons. a1 (0,7) -> 0+7=7 impair=noir. a8(0,0)=pair=blanc.
                            // Donc (fileIdx + rankIdx) % 2 === 0 => BLANC, 1 => NOIR.
                            
                            // Attention aux index inversés selon l'affichage
                            const fileInt = files.indexOf(file);
                            const rankInt = ranks.indexOf(rank);
                            const isDark = (fileInt + rankInt) % 2 === 1; // standard chess logic

                            const squareStatus = status[coord];
                            const piece = pieces[coord];

                            return (
                                <div 
                                    key={coord}
                                    onClick={() => onSquareClick && onSquareClick(coord)}
                                    className={`relative flex items-center justify-center text-3xl md:text-5xl cursor-pointer transition-all ${
                                        isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]'
                                    } ${squareStatus === 'selected' ? 'ring-4 ring-blue-400 z-10' : ''} 
                                      ${squareStatus === 'correct' ? 'bg-green-500/50' : ''} 
                                      ${squareStatus === 'error' ? 'bg-red-500/50' : ''}`}
                                >
                                    {/* Coordonnées */}
                                    {fIdx === 0 && <span className={`absolute left-0.5 top-0.5 text-[8px] md:text-[10px] font-bold opacity-50 ${isDark ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>{rank}</span>}
                                    {rIdx === 7 && <span className={`absolute right-0.5 bottom-0.5 text-[8px] md:text-[10px] font-bold opacity-50 ${isDark ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>{file}</span>}
                                    
                                    {piece && (
                                        <span className={`select-none drop-shadow-md transition-transform hover:scale-110 z-20 ${piece === piece.toUpperCase() ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-black'}`}>
                                            {pieceMap[piece] || piece}
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    ))}

                    {/* SVG Overlay pour les flèches */}
                    {arrows.length > 0 && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                                    <path d="M0,0 L4,2 L0,4 L1,2 Z" fill="red" />
                                </marker>
                            </defs>
                            {arrows.map((arrow, idx) => {
                                const start = getSquareCenter(arrow.from);
                                const end = getSquareCenter(arrow.to);
                                return (
                                    <line 
                                        key={idx}
                                        x1={start.x} y1={start.y}
                                        x2={end.x} y2={end.y}
                                        stroke={arrow.color || "#ef4444"}
                                        strokeWidth="2"
                                        markerEnd="url(#arrowhead)"
                                        opacity="0.8"
                                    />
                                );
                            })}
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
};
