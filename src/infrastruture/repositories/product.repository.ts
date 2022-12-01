import { ProductModel } from "../../domain/models/product.model";
import { IProductRepository } from "../../domain/repositories/product.repository";
import { CreatedAtVO } from "../../domain/value-objects/created-at.vo";
import { DescriptionVO } from "../../domain/value-objects/description.vo";
import { NameVO } from "../../domain/value-objects/name.vo";
import { PriceVO } from "../../domain/value-objects/price.vo";
import { QuantityVO } from "../../domain/value-objects/quantity.vo";
import { StateVO } from "../../domain/value-objects/state.vo";
import { UuidVO } from "../../domain/value-objects/uuid.vo";
import { Product } from "../models/product";
import { IProduct } from "../types/models/product.model";
import { ProductInterface } from "../types/product.interface";

class ProductRepository implements IProductRepository {
  toPersistance(productDomain: ProductModel): ProductInterface {
    return {
      id: productDomain.id.value,
      name: productDomain.name.value,
      description: productDomain.description.value,
      imageUrl: "",
      price: productDomain.price.value,
      categoryId: productDomain.categoryId.value,
      quantity: productDomain.quantity.value,
      state: productDomain.state.value,
      createdAt: productDomain.createdAt.value,
    };
  }

  toDomain(productPersistance: IProduct): ProductModel {
    return new ProductModel(
      new UuidVO(productPersistance.id),
      new NameVO(productPersistance.name),
      new DescriptionVO(productPersistance.description),
      null,
      new UuidVO(productPersistance.categoryId),
      new PriceVO(0),
      new QuantityVO(0),
      new StateVO(productPersistance.state),
      new CreatedAtVO(productPersistance.createdAt)
    );
  }

  async findById(id: UuidVO): Promise<ProductModel | null> {
    const product = await Product.findByPk(id.value);
    if (!product) return null;
    return this.toDomain(product);
  }

  async findByName(name: NameVO): Promise<ProductModel | null> {
    const product = await Product.findByPk(name.value);
    if (!product) return null;
    return this.toDomain(product);
  }

  async create(product: ProductModel): Promise<ProductModel | null> {
    const productCreated = await Product.create(this.toPersistance(product));
    if (!productCreated) return null;
    return this.toDomain(productCreated);
  }

  async delete(productId: UuidVO): Promise<number | null> {
    const productDelete = await Product.destroy({
      where: { id: productId.value },
    });

    return null;
  }

  async findAll(): Promise<ProductModel[] | null> {
    const products = await Product.findAll();
    if (!products) return null;
    return products.map((product) => this.toDomain(product));
  }
  async update(product: ProductModel): Promise<ProductModel | null> {
    const { id, name, description, state } = this.toPersistance(product);

    const categoryUpdate = await Product.update(
      {
        name: name,
        description: description,
        state: state,
      },
      {
        where: { id: id },
        returning: true,
      }
    );
    //todo => should return productModel updated
    return null;
  }
}

export default new ProductRepository();
