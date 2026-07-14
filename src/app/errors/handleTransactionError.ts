/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { TErrorSources, TGenericErrorResponse } from '../interface/error';
import httpStatus from 'http-status';

const handleTransactionError = (
  err: PrismaClientKnownRequestError,
): TGenericErrorResponse => {
  const errorSources: TErrorSources = [
    {
      path: '',
      message:
        'Transaction failed due to write conflict or deadlock. Please try again.',
    },
  ];

  return {
    statusCode: httpStatus.CONFLICT,
    message: 'Failed to update data! Please try again.',
    errorSources,
  };
};

export default handleTransactionError;
