/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { PrismaClientValidationError } from '@prisma/client/runtime/library';
import { TErrorSources, TGenericErrorResponse } from '../interface/error';
import httpStatus from 'http-status';

const handleValidationError = (
  _err: PrismaClientValidationError,
): TGenericErrorResponse => {
  const errorSources: TErrorSources = [
    {
      path: '',
      message: 'Invalid query parameters or provided data.',
    },
  ];

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: 'Invalid provider data!',
    errorSources,
  };
};

export default handleValidationError;
