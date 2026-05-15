export const softDeleteDelegates = {
  Company: "company",
  Contact: "contact",
  Address: "address",
  PhoneNumber: "phoneNumber",
  Pipeline: "pipeline",
  PipelineStage: "pipelineStage",
  Deal: "deal",
  Activity: "activity",
  Note: "note",
  Task: "task",
  Tag: "tag",
  CustomFieldDefinition: "customFieldDefinition",
  CustomFieldValue: "customFieldValue",
} as const;

export type SoftDeleteModel = keyof typeof softDeleteDelegates;

type QueryArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

export function isSoftDeleteModel(
  model: string | undefined,
): model is SoftDeleteModel {
  return Boolean(model && model in softDeleteDelegates);
}

export function scopeActive<T extends QueryArgs>(args: T): T {
  return {
    ...args,
    where: {
      ...args.where,
      deletedAt: null,
    },
  } as T;
}

export function createSoftDeleteExtension(basePrisma: unknown) {
  return {
    name: "softDelete",
    query: {
      $allModels: {
        async findFirst({ model, args, query }: any) {
          return query(isSoftDeleteModel(model) ? scopeActive(args) : args);
        },
        async findFirstOrThrow({ model, args, query }: any) {
          return query(isSoftDeleteModel(model) ? scopeActive(args) : args);
        },
        async findUnique({ model, args, query }: any) {
          return query(isSoftDeleteModel(model) ? scopeActive(args) : args);
        },
        async findUniqueOrThrow({ model, args, query }: any) {
          return query(isSoftDeleteModel(model) ? scopeActive(args) : args);
        },
        async findMany({ model, args, query }: any) {
          return query(isSoftDeleteModel(model) ? scopeActive(args) : args);
        },
        async count({ model, args, query }: any) {
          return query(isSoftDeleteModel(model) ? scopeActive(args) : args);
        },
        async aggregate({ model, args, query }: any) {
          return query(isSoftDeleteModel(model) ? scopeActive(args) : args);
        },
        async groupBy({ model, args, query }: any) {
          return query(isSoftDeleteModel(model) ? scopeActive(args) : args);
        },
        async update({ model, args, query }: any) {
          return query(isSoftDeleteModel(model) ? scopeActive(args) : args);
        },
        async updateMany({ model, args, query }: any) {
          return query(isSoftDeleteModel(model) ? scopeActive(args) : args);
        },
        async delete({ model, args, query }: any) {
          if (!isSoftDeleteModel(model)) {
            return query(args);
          }

          const delegateName = softDeleteDelegates[model];
          return (basePrisma as any)[delegateName].update({
            where: args.where,
            data: { deletedAt: new Date() },
          });
        },
        async deleteMany({ model, args, query }: any) {
          if (!isSoftDeleteModel(model)) {
            return query(args);
          }

          const delegateName = softDeleteDelegates[model];
          return (basePrisma as any)[delegateName].updateMany({
            where: scopeActive(args).where,
            data: { deletedAt: new Date() },
          });
        },
      },
    },
  };
}
