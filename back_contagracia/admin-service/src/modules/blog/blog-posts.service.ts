import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto, UpdatePostDto } from './dto';

@Injectable()
export class BlogPostsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    tag_id?: string;
    status?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 15;
    const skip = (page - 1) * limit;

    const where: any = { is_active: true };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status === 'published') {
      where.published_at = { not: null };
    } else if (query.status === 'draft') {
      where.published_at = null;
    }

    if (query.tag_id) {
      where.post_tags = { some: { tag_id: query.tag_id } };
    }

    const [data, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          post_tags: { include: { tag: true } },
          analytics: true,
          _count: { select: { comments: true, views: true } },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data: data.map((post) => ({
        ...post,
        tags: post.post_tags.map((pt) => pt.tag),
        post_tags: undefined,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        post_tags: { include: { tag: true } },
        analytics: true,
        _count: { select: { comments: true, views: true } },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post con ID ${id} no encontrado`);
    }

    return {
      ...post,
      tags: post.post_tags.map((pt) => pt.tag),
      post_tags: undefined,
    };
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        post_tags: { include: { tag: true } },
        analytics: true,
        author: { select: { id: true, full_name: true, email: true } },
        _count: { select: { comments: true, views: true } },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post con slug "${slug}" no encontrado`);
    }

    return {
      ...post,
      tags: post.post_tags.map((pt) => pt.tag),
      post_tags: undefined,
    };
  }

  async create(createDto: CreatePostDto) {
    const existing = await this.prisma.blogPost.findUnique({
      where: { slug: createDto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un post con el slug "${createDto.slug}"`,
      );
    }

    const { tag_ids, ...postData } = createDto;

    const post = await this.prisma.blogPost.create({
      data: {
        ...postData,
        published_at: postData.published_at
          ? new Date(postData.published_at)
          : null,
        post_tags: tag_ids?.length
          ? {
              create: tag_ids.map((tag_id) => ({ tag_id })),
            }
          : undefined,
        analytics: { create: {} },
      },
      include: {
        post_tags: { include: { tag: true } },
        analytics: true,
      },
    });

    return {
      ...post,
      tags: post.post_tags.map((pt) => pt.tag),
      post_tags: undefined,
    };
  }

  async update(id: string, updateDto: UpdatePostDto) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post con ID ${id} no encontrado`);
    }

    if (updateDto.slug && updateDto.slug !== post.slug) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug: updateDto.slug },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un post con el slug "${updateDto.slug}"`,
        );
      }
    }

    const { tag_ids, ...postData } = updateDto;

    // Update tags if provided
    if (tag_ids !== undefined) {
      await this.prisma.blogPostTag.deleteMany({ where: { post_id: id } });
      if (tag_ids.length > 0) {
        await this.prisma.blogPostTag.createMany({
          data: tag_ids.map((tag_id) => ({ post_id: id, tag_id })),
        });
      }
    }

    const updated = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...postData,
        published_at:
          postData.published_at !== undefined
            ? postData.published_at
              ? new Date(postData.published_at)
              : null
            : undefined,
      },
      include: {
        post_tags: { include: { tag: true } },
        analytics: true,
        _count: { select: { comments: true, views: true } },
      },
    });

    return {
      ...updated,
      tags: updated.post_tags.map((pt) => pt.tag),
      post_tags: undefined,
    };
  }

  async remove(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post con ID ${id} no encontrado`);
    }

    return this.prisma.blogPost.delete({ where: { id } });
  }
}
