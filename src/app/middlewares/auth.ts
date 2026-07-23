/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../errors/AppError';
import prisma from '../utils/prisma';
import { TUserRole } from '../interface/userRole';

const Auth = (...requiredRole: TUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    // checking if the token is sent from the client
    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    // decode the token from base64
    const decodedToken = Buffer.from(token, 'base64').toString('utf-8');

    if (!decodedToken) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    // checking if the token is valid
    let decoded;
    try {
      decoded = jwt.verify(
        decodedToken,
        config.jwtAccessSecret as string,
      ) as JwtPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Session expired!');
      } else {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized');
      }
    }

    // destructure the decoded token
    const { userId, role, iat } = decoded;

    // checking if the user is exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'This user is not found !');
    }
    // checking if the user is already deleted

    if (user.isDeleted) {
      throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted !');
    }

    // const userStatus = user?.status;

    // if (userStatus === 'BLOCKED') {
    //   throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked !');
    // }

    if (
      user.passwordChangedAt &&
      (iat as number) < user.passwordChangedAt.getTime() / 1000
    ) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized !');
    }

    if (requiredRole && !requiredRole.includes(role)) {
      throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized');
    }

    // decoded value
    req.user = decoded as JwtPayload;
    // console.log('req.user', req.user);
    next();
  });
};

export default Auth;
