/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { RequestHandler } from 'express';
import httpStatus from 'http-status';

const notFound: RequestHandler = (req, res, next): void => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: 'Api Not Found!',
    error: '',
  });
};

export default notFound;
