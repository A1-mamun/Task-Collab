/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { ErrorRequestHandler } from 'express';
import { TErrorSources } from '../interface/error';
import { ZodError } from 'zod';
import handleZodError from '../errors/handleZodError';
import AppError from '../errors/AppError';
import prisma from '../utils/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import handleUniqueError from '../errors/handleUniqueError';
import handleRecordNotFoundError from '../errors/handleRecordNotFoundError';
import handleTransactionError from '../errors/handleTransactionError';
import handleForeignKeyError from '../errors/handleForeignKeyError';

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Something went wrong';

  let errorSources: TErrorSources = [
    {
      path: '',
      message: 'Something went wrong',
    },
  ];

  if (err instanceof ZodError) {
    const simpleError = handleZodError(err);

    statusCode = simpleError?.statusCode;
    message = simpleError?.message;
  } else if (err instanceof PrismaClientKnownRequestError) {
    let simpleError;

    switch (err.code) {
      case 'P2002':
        simpleError = handleUniqueError(err);
        break;
      case 'P2025':
        simpleError = handleRecordNotFoundError(err);
        break;
      case 'P2034':
        simpleError = handleTransactionError(err);
        break;
      case 'P2003':
        simpleError = handleForeignKeyError(err);
        break;
      default:
        // Generic Prisma error
        statusCode = 400;
        message = 'Database operation failed';
        errorSources = [
          {
            path: '',
            message: err.message || 'Database operation failed',
          },
        ];
        break;
    }

    if (simpleError) {
      statusCode = simpleError.statusCode;
      message = simpleError.message;
      errorSources = simpleError.errorSources;
    }
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  } else if (err instanceof Error) {
    message = err?.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
};

export default globalErrorHandler;
