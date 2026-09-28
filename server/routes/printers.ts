import type { Router as ExpressRouter } from 'express';
import printerRouter from '../printer';

/**
 * Ponto único das rotas de impressora. A implementação continua em
 * server/printer; aqui fica apenas o contrato exposto pela API.
 */
export const printersRouter: ExpressRouter = printerRouter;
export default printersRouter;
