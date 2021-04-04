﻿// <auto-generated />
using System;
using ASC.Core.Common.EF.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ASC.Core.Common.Migrations.MySql.ResourceDbContextMySql
{
    [DbContext(typeof(MySqlResourceDbContext))]
    [Migration("20210309094839_ResourceDbContextMySql")]
    partial class ResourceDbContextMySql
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("Relational:MaxIdentifierLength", 64)
                .HasAnnotation("ProductVersion", "5.0.3");

            modelBuilder.Entity("ASC.Core.Common.EF.Model.Resource.ResAuthors", b =>
                {
                    b.Property<string>("Login")
                        .HasColumnType("varchar(150)")
                        .HasColumnName("login")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<bool>("IsAdmin")
                        .HasColumnType("tinyint(1)")
                        .HasColumnName("isAdmin");

                    b.Property<DateTime>("LastVisit")
                        .HasColumnType("datetime")
                        .HasColumnName("lastVisit");

                    b.Property<bool>("Online")
                        .HasColumnType("tinyint(1)")
                        .HasColumnName("online");

                    b.Property<string>("Password")
                        .IsRequired()
                        .HasColumnType("varchar(50)")
                        .HasColumnName("password")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.HasKey("Login")
                        .HasName("PRIMARY");

                    b.ToTable("res_authors");
                });

            modelBuilder.Entity("ASC.Core.Common.EF.Model.Resource.ResAuthorsFile", b =>
                {
                    b.Property<string>("AuthorLogin")
                        .HasColumnType("varchar(50)")
                        .HasColumnName("authorLogin")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<int>("FileId")
                        .HasColumnType("int")
                        .HasColumnName("fileid");

                    b.Property<bool>("WriteAccess")
                        .HasColumnType("tinyint(1)")
                        .HasColumnName("writeAccess");

                    b.HasKey("AuthorLogin", "FileId")
                        .HasName("PRIMARY");

                    b.HasIndex("FileId")
                        .HasDatabaseName("res_authorsfile_FK2");

                    b.ToTable("res_authorsfile");
                });

            modelBuilder.Entity("ASC.Core.Common.EF.Model.Resource.ResAuthorsLang", b =>
                {
                    b.Property<string>("AuthorLogin")
                        .HasColumnType("varchar(50)")
                        .HasColumnName("authorLogin")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<string>("CultureTitle")
                        .HasColumnType("varchar(20)")
                        .HasColumnName("cultureTitle")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.HasKey("AuthorLogin", "CultureTitle")
                        .HasName("PRIMARY");

                    b.HasIndex("CultureTitle")
                        .HasDatabaseName("res_authorslang_FK2");

                    b.ToTable("res_authorslang");
                });

            modelBuilder.Entity("ASC.Core.Common.EF.Model.Resource.ResCultures", b =>
                {
                    b.Property<string>("Title")
                        .HasColumnType("varchar(120)")
                        .HasColumnName("title")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<bool>("Available")
                        .HasColumnType("tinyint(1)")
                        .HasColumnName("available");

                    b.Property<DateTime>("CreationDate")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("timestamp")
                        .HasColumnName("creationDate")
                        .HasDefaultValueSql("CURRENT_TIMESTAMP");

                    b.Property<string>("Value")
                        .IsRequired()
                        .HasColumnType("varchar(120)")
                        .HasColumnName("value")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.HasKey("Title")
                        .HasName("PRIMARY");

                    b.ToTable("res_cultures");
                });

            modelBuilder.Entity("ASC.Core.Common.EF.Model.Resource.ResData", b =>
                {
                    b.Property<int>("FileId")
                        .HasColumnType("int")
                        .HasColumnName("fileid");

                    b.Property<string>("CultureTitle")
                        .HasColumnType("varchar(20)")
                        .HasColumnName("cultureTitle")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<string>("Title")
                        .HasColumnType("varchar(120)")
                        .HasColumnName("title")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<string>("AuthorLogin")
                        .IsRequired()
                        .ValueGeneratedOnAdd()
                        .HasColumnType("varchar(50)")
                        .HasColumnName("authorLogin")
                        .HasDefaultValueSql("'Console'")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<string>("Description")
                        .HasColumnType("text")
                        .HasColumnName("description")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<int>("Flag")
                        .HasColumnType("int")
                        .HasColumnName("flag");

                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int")
                        .HasColumnName("id");

                    b.Property<string>("Link")
                        .HasColumnType("varchar(120)")
                        .HasColumnName("link")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<string>("ResourceType")
                        .HasColumnType("varchar(20)")
                        .HasColumnName("resourceType")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<string>("TextValue")
                        .HasColumnType("text")
                        .HasColumnName("textValue")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<DateTime>("TimeChanges")
                        .ValueGeneratedOnAddOrUpdate()
                        .HasColumnType("timestamp")
                        .HasColumnName("timeChanges")
                        .HasDefaultValueSql("CURRENT_TIMESTAMP");

                    b.HasKey("FileId", "CultureTitle", "Title")
                        .HasName("PRIMARY");

                    b.HasIndex("CultureTitle")
                        .HasDatabaseName("resources_FK2");

                    b.HasIndex("Id")
                        .IsUnique()
                        .HasDatabaseName("id");

                    b.HasIndex("TimeChanges")
                        .HasDatabaseName("dateIndex");

                    b.ToTable("res_data");
                });

            modelBuilder.Entity("ASC.Core.Common.EF.Model.Resource.ResFiles", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int")
                        .HasColumnName("id");

                    b.Property<DateTime>("CreationDate")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("timestamp")
                        .HasColumnName("creationDate")
                        .HasDefaultValueSql("'0000-00-00 00:00:00'");

                    b.Property<bool>("IsLock")
                        .HasColumnType("tinyint(1)")
                        .HasColumnName("isLock");

                    b.Property<DateTime>("LastUpdate")
                        .ValueGeneratedOnAddOrUpdate()
                        .HasColumnType("timestamp")
                        .HasColumnName("lastUpdate")
                        .HasDefaultValueSql("CURRENT_TIMESTAMP");

                    b.Property<string>("ModuleName")
                        .IsRequired()
                        .HasColumnType("varchar(50)")
                        .HasColumnName("moduleName")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<string>("ProjectName")
                        .IsRequired()
                        .HasColumnType("varchar(50)")
                        .HasColumnName("projectName")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<string>("ResName")
                        .IsRequired()
                        .HasColumnType("varchar(50)")
                        .HasColumnName("resName")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.HasKey("Id");

                    b.HasIndex("ResName")
                        .IsUnique()
                        .HasDatabaseName("resname");

                    b.ToTable("res_files");
                });

            modelBuilder.Entity("ASC.Core.Common.EF.Model.Resource.ResReserve", b =>
                {
                    b.Property<int>("FileId")
                        .HasColumnType("int")
                        .HasColumnName("fileid");

                    b.Property<string>("Title")
                        .HasColumnType("varchar(120)")
                        .HasColumnName("title")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<string>("CultureTitle")
                        .HasColumnType("varchar(20)")
                        .HasColumnName("cultureTitle")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.Property<int>("Flag")
                        .HasColumnType("int")
                        .HasColumnName("flag");

                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("int")
                        .HasColumnName("id");

                    b.Property<string>("TextValue")
                        .HasColumnType("text")
                        .HasColumnName("textValue")
                        .UseCollation("utf8_general_ci")
                        .HasCharSet("utf8");

                    b.HasKey("FileId", "Title", "CultureTitle")
                        .HasName("PRIMARY");

                    b.HasIndex("CultureTitle")
                        .HasDatabaseName("resources_FK2");

                    b.HasIndex("Id")
                        .IsUnique()
                        .HasDatabaseName("id");

                    b.ToTable("res_reserve");
                });
#pragma warning restore 612, 618
        }
    }
}