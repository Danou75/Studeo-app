/**
 * hooks/useChatMessage.ts — Envoi de message au tuteur via React Query useMutation.
 *
 * Le chat est une action non-cachable (chaque message doit être envoyé),
 * mais React Query apporte :
 *   - isPending : état de chargement typé
 *   - error     : gestion d'erreur centralisée
 *   - retry     : 1 retry automatique en cas d'erreur réseau transitoire
 *   - onMutate/onError : callbacks pour l'optimistic UI (affichage immédiat du message utilisateur)
 *
 * Usage :
 *   const { sendMessage, isPending, error } = useChatMessage();
 *
 *   sendMessage({
 *     sessionId, history, userMessage,
 *     tutorName, tutorSubject, tutorStyle,
 *     provider, apiKey, modelName,
 *   }, {
 *     onSuccess: (response) => appendAssistantMessage(response),
 *     onError:   (err) => showToast(err.message, 'error'),
 *   });
 */

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChatService, ChatMessage } from '../services/chatService';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SendMessageInput {
    sessionId:    string;
    history:      ChatMessage[];
    userMessage:  string;
    tutorName:    string;
    tutorSubject: string;
    tutorStyle:   string;
    provider:     string;
    apiKey?:      string;
    modelName?:   string;
}

export interface SendMessageResult {
    response:   string;
    sessionId:  string;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export const useChatMessage = () => {
    const { mutateAsync, isPending, error, reset } = useMutation<
        SendMessageResult,
        Error,
        SendMessageInput
    >({
        mutationFn: async ({
            sessionId, history, userMessage,
            tutorName, tutorSubject, tutorStyle,
            provider, apiKey, modelName,
        }) => {
            const response = await ChatService.sendMessage(
                sessionId,
                history,
                userMessage,
                tutorName,
                tutorSubject,
                tutorStyle,
                provider,
                apiKey,
                modelName
            );
            return { response, sessionId };
        },

        // 1 retry pour les erreurs réseau transitoires
        // (pas plus, car on ne veut pas doubler les messages)
        retry: 1,
        retryDelay: 1500,
    });

    // ── API simplifiée ───────────────────────────────────────────────────────
    const sendMessage = useCallback(
        (
            input: SendMessageInput,
            callbacks?: {
                onSuccess?: (result: SendMessageResult) => void;
                onError?:   (err: Error) => void;
                onSettled?: () => void;
            }
        ) =>
            mutateAsync(input)
                .then((result) => {
                    callbacks?.onSuccess?.(result);
                    return result;
                })
                .catch((err: Error) => {
                    callbacks?.onError?.(err);
                    throw err;
                })
                .finally(() => {
                    callbacks?.onSettled?.();
                }),
        [mutateAsync]
    );

    return {
        sendMessage,
        isPending,
        isSending: isPending, // alias plus expressif pour le chat
        error,
        reset,
    };
};
