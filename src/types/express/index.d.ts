declare global {
  namespace Express {
    interface Request {
      validatedBody: any;
      validatedParams: any;
      validatedQuery: any;
      paginate: {
        skip: number;
        take: number;
      };
    }a
  }
}

export {};
