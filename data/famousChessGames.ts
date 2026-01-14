// Parties célèbres de l'histoire des échecs
// Format PGN simplifié pour l'affichage et l'analyse

export interface FamousGame {
    id: string;
    title: string;
    players: {
        white: string;
        black: string;
    };
    event: string;
    year: number;
    result: '1-0' | '0-1' | '1/2-1/2';
    description: string;
    opening: string;
    keyMoment: string;
    moves: string; // PGN notation
    analysis: string;
}

export const FAMOUS_GAMES: FamousGame[] = [
    {
        id: 'immortal-game',
        title: '🔥 La Partie Immortelle',
        players: {
            white: 'Adolf Anderssen',
            black: 'Lionel Kieseritzky'
        },
        event: 'Partie informelle',
        year: 1851,
        result: '1-0',
        opening: 'Gambit du Roi',
        description: 'L\'une des parties les plus célèbres de l\'histoire des échecs. Anderssen sacrifie sa dame et ses deux tours pour un mat spectaculaire.',
        keyMoment: 'Le sacrifice de la Dame au 18e coup (Bd6!) suivi de Qxb2 et du mat final avec Be7# au 23e coup. Anderssen sacrifie tout son matériel pour un mat avec les pièces mineures.',
        moves: '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#',
        analysis: 'Cette partie illustre le style romantique des échecs du 19e siècle : sacrifices audacieux et attaques spectaculaires. Anderssen démontre que la coordination des pièces et l\'initiative valent plus que le matériel.'
    },
    {
        id: 'evergreen-game',
        title: '🌲 La Partie Toujours Verte',
        players: {
            white: 'Adolf Anderssen',
            black: 'Jean Dufresne'
        },
        event: 'Berlin',
        year: 1852,
        result: '1-0',
        opening: 'Gambit Evans',
        description: 'Surnommée "Evergreen" pour sa fraîcheur intemporelle. Un chef-d\'œuvre tactique avec un sacrifice de Dame magistral.',
        keyMoment: 'Le sacrifice Qxd7+! au 21e coup force le roi noir dans une marche fatale.',
        moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7#',
        analysis: 'Anderssen sacrifie sa Dame pour exposer le roi adverse. La coordination parfaite entre les pièces blanches mène à un mat forcé, démontrant la puissance de l\'attaque combinée.'
    },
    {
        id: 'opera-game',
        title: '🎭 La Partie de l\'Opéra',
        players: {
            white: 'Paul Morphy',
            black: 'Duc de Brunswick et Comte Isouard'
        },
        event: 'Opéra de Paris',
        year: 1858,
        result: '1-0',
        opening: 'Défense Philidor',
        description: 'Jouée dans une loge de l\'Opéra de Paris, cette partie montre le génie tactique de Morphy. Une masterclass de développement et d\'attaque.',
        keyMoment: 'Le sacrifice de Dame Qb8+! au 16e coup force le mat en quelques coups.',
        moves: '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#',
        analysis: 'Morphy démontre l\'importance du développement rapide et de la coordination des pièces. Chaque coup blanc a un but précis, menant à une victoire éclatante en seulement 17 coups.'
    },
    {
        id: 'game-of-century',
        title: '⭐ La Partie du Siècle',
        players: {
            white: 'Donald Byrne',
            black: 'Bobby Fischer (13 ans)'
        },
        event: 'Rosenwald Trophy',
        year: 1956,
        result: '0-1',
        opening: 'Défense Grünfeld',
        description: 'À seulement 13 ans, Fischer produit un chef-d\'œuvre tactique contre un grand maître expérimenté. Considérée comme l\'une des plus belles parties jamais jouées.',
        keyMoment: 'Le sacrifice de Dame 17...Be6!! est le coup brillant qui force la victoire.',
        moves: '1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2#',
        analysis: 'Fischer démontre une compréhension profonde de la dynamique des pièces. Son sacrifice de Dame force une série de coups forcés menant à un mat imparable. Un génie précoce à l\'œuvre.'
    },
    {
        id: 'kasparov-topalov',
        title: '💎 Le Coup du Siècle',
        players: {
            white: 'Garry Kasparov',
            black: 'Veselin Topalov'
        },
        event: 'Wijk aan Zee',
        year: 1999,
        result: '1-0',
        opening: 'Défense Pirc',
        description: 'Kasparov produit l\'un des coups les plus brillants de l\'histoire moderne : 24. Rxd4!! Un sacrifice de tour qui défie toute logique.',
        keyMoment: 'Le sacrifice 24. Rxd4!! cxd4 25. Re7+ suivi de la marche du roi blanc est époustouflant.',
        moves: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0',
        analysis: 'Kasparov calcule 15 coups à l\'avance pour sacrifier sa tour. Le roi blanc marche héroïquement au centre de l\'échiquier pour participer à l\'attaque. Une démonstration de calcul et de courage.'
    },
    {
        id: 'carlsen-karjakin',
        title: '🏆 Championnat du Monde 2016',
        players: {
            white: 'Magnus Carlsen',
            black: 'Sergey Karjakin'
        },
        event: 'Championnat du Monde - Partie 10',
        year: 2016,
        result: '1-0',
        opening: 'Défense Berlinoise',
        description: 'Dans une position apparemment nulle, Carlsen trouve des ressources infinies pour gagner une finale de tours. 50 coups de précision absolue.',
        keyMoment: 'La manœuvre 50. Kg6! commence la marche victorieuse du roi blanc.',
        moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. d3 Bc5 5. Bxc6 dxc6 6. O-O Nd7 7. Nbd2 O-O 8. Qe1 f6 9. Nc4 Rf7 10. a4 Bf8 11. Kh1 Nc5 12. Qe2 Ne6 13. Be3 Nd4 14. Bxd4 exd4 15. e5 fxe5 16. Ncxe5 Rf5 17. Ng4 Bf6 18. Rae1 h5 19. Nh6+ gxh6 20. Nxf6+ Rxf6 21. Qxe8+ Qxe8 22. Rxe8+ Kf7 23. Rxa8 Bxa8 24. Kg1 Ke6 25. Re1+ Kd5 26. Kf1 Rf4 27. g3 Rf7 28. Kg2 c5 29. Re8 Bc6 30. Rh8 Rg7 31. Kh3 Ke5 32. Rxh6 Kf5 33. Rxh5+ Kg6 34. Rh8 Kf7 35. Rc8 Ke6 36. Kg2 Kd5 37. Kf1 Rg6 38. Re8 Kd6 39. Rh8 Ke5 40. Re8+ Kf6 41. Rc8 Ke5 42. Rxc7 Rg7 43. Rxc6 bxc6 44. Ke2 Rg6 45. f4+ Kd5 46. Kf3 Re6 47. h4 Rf6 48. Kg4 Ke6 49. Kg5 Rf7 50. Kg6 Rf8 51. Kg7 Ra8 52. h5 c4 53. dxc4 d3 54. cxd3 Rxa4 55. h6 Rxc4 56. h7 Rc1 57. Kg8 Rg1 58. h8=Q Rxg3+ 59. Kf8 Rf3 60. Qh4 c5 61. Kg7 1-0',
        analysis: 'Carlsen transforme une position égale en victoire grâce à sa technique impeccable. Chaque coup est optimal, ne laissant aucune chance à son adversaire. Un modèle de précision en finale.'
    }
];
