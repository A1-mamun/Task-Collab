export type TErrorSources = {
  path: string | number | PropertyKey;
  message: string;
}[];

export type TGenericErrorResponse = {
  statusCode: number;
  message: string;
  errorSources: TErrorSources;
};
